from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import os
import sys
import json
import logging
from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import pathlib

# Get the script's directory
SCRIPT_DIR = os.path.join(pathlib.Path(__file__).parent.resolve(), "log")

# Configuration
CONFIG = {
    'LOG_FILE': os.path.join(SCRIPT_DIR, 'scraper.log'),
    'MAX_WORKERS': 10, # Number of concurrent workers
    'MAX_DECKS': 20, # Max Decks to scrape
    'TOURNAMENT_META_FILE': os.path.join(os.getcwd(), "src", "data", "deckTournamentMeta.json")
}

# Ensure log directory exists
os.makedirs(SCRIPT_DIR, exist_ok=True)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(CONFIG['LOG_FILE'], mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger('DeckScraper')

# Store original stderr
original_stderr = sys.stderr
DEBUG = False  # Disable debugging

def create_new_driver():
    """Creates a new WebDriver instance."""
    edge_options = Options()
    edge_options.add_argument("--headless")
    edge_options.add_argument("--log-level=OFF")
    edge_options.add_experimental_option('excludeSwitches', ["--disable-logging"])
    service = Service(log_path=os.devnull)
    return webdriver.Edge(service=service, options=edge_options)

def find_and_click_button(css_selector, driver):
    """Utility function to find and click a button."""
    try:
        button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.CSS_SELECTOR, css_selector))
        )
        driver.execute_script("arguments[0].scrollIntoView();", button)
        button.click()
        time.sleep(1)  # Small delay to let the page react
        return True
    except Exception as e:
        logger.error(f"Button click failed for selector '{css_selector}': {e}")
        return False

def scrape_deck_matchups_with_new_driver(deck_name, url):
    """Worker function that creates its own WebDriver instance to scrape matchups."""
    if not url or url == "N/A":
        return {}

    driver = None
    try:
        driver = create_new_driver()
        driver.get(url)

        # Click the "Matchups" button if it exists
        try:
            matchup_link = WebDriverWait(driver, 10).until(
                EC.element_to_be_clickable((By.CSS_SELECTOR, "a[href*='matchups']"))
            )
            matchup_link.click()
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, "table.striped tbody tr"))
            )
        except Exception as e:
            logger.error(f"Error accessing matchups for {deck_name}: {e}")
            return {}

        # Extract table rows
        rows = driver.find_elements(By.CSS_SELECTOR, "table.striped tbody tr")
        data = {}
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 5:
                opponent_deck = cells[1].text.strip()
                matches = cells[2].text.strip()
                score = cells[3].text.strip()
                win_rate = cells[4].text.strip()
                data[opponent_deck] = {
                    "Matches": matches,
                    "Score": score,
                    "Win Rate": win_rate
                }
        return data
    except Exception as e:
        logger.error(f"Error scraping matchups for {deck_name}: {e}")
        return {}
    finally:
        if driver:
            driver.quit()

def save_data_to_json(data, filename="pocket_decks_data.json"):
    """Save the scraped data to deckTournamentMeta.json with timestamp key."""
    from datetime import datetime
    
    # Get the current date in YYYY-MM-DD format
    today = datetime.now().strftime("%Y-%m-%d")
    
    # Path to the tournament meta file
    tournament_meta_path = CONFIG['TOURNAMENT_META_FILE']
    
    # Create directories if they don't exist
    os.makedirs(os.path.dirname(tournament_meta_path), exist_ok=True)
    
    # Check if the file exists and load existing data
    existing_data = {}
    if os.path.exists(tournament_meta_path):
        try:
            with open(tournament_meta_path, 'r', encoding='utf-8') as f:
                existing_data = json.load(f)
                logger.info(f"Loaded existing tournament meta data with {len(existing_data.keys())} date entries")
                
                # Check if today's key already exists and warn if it does
                if today in existing_data:
                    logger.warning(f"Warning: Data for today ({today}) already exists and will be overwritten")
        except Exception as e:
            logger.error(f"Error loading existing tournament meta data: {e}")
    
    # Update the data with the new timestamp while preserving all existing entries
    existing_data[today] = data
    
    # Save the updated data
    try:
        with open(tournament_meta_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=4, ensure_ascii=False)
        logger.info(f"Data saved to {tournament_meta_path} with timestamp key {today}")
        logger.info(f"File now contains data for {len(existing_data.keys())} dates")
    except Exception as e:
        logger.error(f"Error saving data to JSON: {e}")

def correct_historical_data():
    """Corrects historical data by applying the 'Other' category to previous days."""
    logger.info("Starting correction of historical matchup data...")
    
    # Path to the tournament meta file
    tournament_meta_path = CONFIG['TOURNAMENT_META_FILE']
    
    if not os.path.exists(tournament_meta_path):
        logger.error(f"Tournament meta file not found at {tournament_meta_path}")
        return False
    
    try:
        # Load existing data
        with open(tournament_meta_path, 'r', encoding='utf-8') as f:
            existing_data = json.load(f)
            logger.info(f"Loaded data for {len(existing_data.keys())} dates for correction")
        
        # Process each date's data
        for date, decks in existing_data.items():
            logger.info(f"Correcting data for {date}...")
            existing_data[date] = check_and_normalize_matchups(decks, correct_existing=True)
        
        # Save corrected data
        with open(tournament_meta_path, 'w', encoding='utf-8') as f:
            json.dump(existing_data, f, indent=4, ensure_ascii=False)
        
        logger.info("Historical data correction completed successfully")
        return True
    except Exception as e:
        logger.error(f"Error during historical data correction: {e}")
        return False

def scrape_pocket_decks(max_workers=5):
    """Main function to scrape Pocket TCG deck data with parallel matchup processing."""
    sys.stderr = original_stderr
    start_time = time.time()
    main_driver = None

    try:
        logger.info("Initializing scraper...")
        main_driver = create_new_driver()
        main_driver.get("https://play.limitlesstcg.com/decks?game=POCKET")

        logger.info("Waiting for page to load...")
        WebDriverWait(main_driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table.meta tbody tr"))
        )

        try:
            logger.info("Attempting to show all decks...")
            find_and_click_button("div.show-all", main_driver)
        except Exception as e:
            logger.warning(f"Note: Could not show all decks: {e}")

        logger.info("Gathering deck information...")
        rows = main_driver.find_elements(By.CSS_SELECTOR, "table.meta tbody tr")
        decks = []
        for row in rows:
            if not row.text.strip():
                continue

            cells = row.find_elements(By.TAG_NAME, "td")
            if len(cells) >= 6:
                rank = cells[0].text.strip()
                try:
                    link_element = cells[2].find_element(By.TAG_NAME, "a")
                    deck_name = link_element.text.strip()
                    deck_url = link_element.get_attribute("href")
                except:
                    deck_name = cells[2].text.strip()
                    deck_url = "N/A"

                count = cells[3].text.strip() if len(cells) > 3 else "N/A"
                share = cells[4].text.strip() if len(cells) > 4 else "N/A"
                win_percent = cells[6].text.strip() if len(cells) > 6 else "N/A"

                decks.append({
                    "Rank": rank,
                    "Deck Name": deck_name,
                    "URL": deck_url,
                    "Count": count,
                    "Share": share,
                    "Win %": win_percent,
                })

        logger.info(f"Found {len(decks)} decks")
        main_driver.quit()
        main_driver = None


        logger.info("Starting matchup collection...")
        logger.info(f"Sraping top {CONFIG['MAX_DECKS']} decks")

        decks = decks[:CONFIG['MAX_DECKS']]

        with ThreadPoolExecutor(max_workers=max_workers) as executor:
            future_to_deck = {
                executor.submit(scrape_deck_matchups_with_new_driver, item['Deck Name'], item['URL']): item
                for item in decks
            }
            completed = 0
            for future in as_completed(future_to_deck):
                logger.info(f"Scraping deck {future_to_deck[future]['Deck Name']}")
                item = future_to_deck[future]
                try:
                    item["Matchups"] = future.result()
                    completed += 1
                    logger.info(f"Progress: {completed}/{len(decks)} decks processed")
                except Exception as e:
                    logger.error(f"Error processing {item['Deck Name']}: {e}")
                    item["Matchups"] = {}

        # Final check: ensure all deck names exist in all matchups
        logger.info("Performing final check on matchup data...")
        decks = check_and_normalize_matchups(decks)

        end_time = time.time()
        elapsed_time = end_time - start_time
        logger.info(f"Script execution time: {elapsed_time/60:.2f} minutes")
        save_data_to_json(decks)
        return decks
    except Exception as e:
        logger.error(f"An error occurred during main scraping: {e}")
        return None
    finally:
        if main_driver:
            main_driver.quit()

def print_final_results(data):
    """Parses and prints the final results."""
    if not data:
        logger.warning("No data to display")
        return

    logger.info("Final Results:")
    logger.info(f"Total decks found: {len(data)}")
    for item in data:
        deck_name = item["Deck Name"]
        matchups_count = len(item.get("Matchups", {}))
        logger.info(f"- {deck_name}: {matchups_count} matchups")

def check_and_normalize_matchups(decks, correct_existing=False):
    """
    Ensure all deck names exist in the matchup data for each deck.
    This includes adding self-references and missing matchups.
    For matchups against decks not in the top 20, group them under 'Other'.
    
    Args:
        decks (list): List of deck dictionaries with matchup data
        correct_existing (bool): If True, apply the correction to existing data loaded from file
    """
    logger.info("Normalizing matchup data to ensure consistency...")
    
    # Extract all unique deck names from our top decks
    top_deck_names = {deck["Deck Name"] for deck in decks}
    
    # Process each deck's matchups
    for deck in decks:
        current_deck_name = deck["Deck Name"]
        current_matchups = deck.get("Matchups", {})
        
        # Create a copy to iterate over while we modify the original
        matchup_keys = list(current_matchups.keys())
        
        # Initialize 'Other' category
        other_matches = 0
        other_wins = 0
        other_losses = 0
        
        # Process each matchup
        for opponent_name in matchup_keys:
            # If the opponent is not in our top decks, add to 'Other'
            if opponent_name not in top_deck_names:
                matchup_data = current_matchups[opponent_name]
                
                # Extract scores
                matches = int(matchup_data.get("Matches", "0").replace(',', '')) if "Matches" in matchup_data else 0
                
                # Handle different formats in the data
                if "Score" in matchup_data:
                    score_parts = matchup_data.get("Score", "0-0").split('-')
                    wins = int(score_parts[0].replace(',', '')) if len(score_parts) > 0 else 0
                    losses = int(score_parts[1].replace(',', '')) if len(score_parts) > 1 else 0
                else:
                    # Try to calculate from win rate if no score available
                    win_rate_str = matchup_data.get("Win Rate", "0%").replace('%', '')
                    win_rate = float(win_rate_str) / 100 if win_rate_str and win_rate_str != "0" else 0
                    wins = int(matches * win_rate) if matches > 0 else 0
                    losses = matches - wins if matches > 0 else 0
                
                # Add to 'Other' totals
                other_matches += matches
                other_wins += wins
                other_losses += losses
                
                # Remove this matchup as we're grouping it
                del current_matchups[opponent_name]
        
        # Add the 'Other' category if there were any matches
        if other_matches > 0:
            other_win_rate = f"{(other_wins / other_matches) * 100:.1f}%" if other_matches > 0 else "0%"
            current_matchups["Other"] = {
                "Matches": str(other_matches),
                "Score": f"{other_wins}-{other_losses}",
                "Win Rate": other_win_rate
            }
            logger.info(f"Created 'Other' category for {current_deck_name} with {other_matches} matches")
        
        # Add missing matchups for all top decks not in the current matchups
        for top_deck_name in top_deck_names:
            if top_deck_name not in current_matchups:
                # Add empty matchup data
                current_matchups[top_deck_name] = {
                    "Matches": "0",
                    "Score": "0-0",
                    "Win Rate": "0%"
                }
                logger.info(f"Added missing matchup: {current_deck_name} vs {top_deck_name}")
        
        # Update the matchups in the deck data
        deck["Matchups"] = current_matchups
    
    logger.info(f"Matchup normalization complete. All decks now have matchup data for all top {len(decks)} opponents plus 'Other' category.")
    return decks

if __name__ == "__main__":
    import argparse
    
    # Set up command line arguments
    parser = argparse.ArgumentParser(description="Scrape PTCG Pocket deck data and matchups")
    parser.add_argument("--correct-historical", action="store_true", help="Only correct historical data without scraping new data")
    parser.add_argument("--max-workers", type=int, default=CONFIG['MAX_WORKERS'], help="Maximum number of concurrent workers")
    parser.add_argument("--max-decks", type=int, default=CONFIG['MAX_DECKS'], help="Maximum number of decks to scrape")
    
    args = parser.parse_args()
    
    # Update config based on command line arguments
    CONFIG['MAX_WORKERS'] = args.max_workers
    CONFIG['MAX_DECKS'] = args.max_decks
    
    if args.correct_historical:
        logger.info("Running in historical data correction mode...")
        correct_historical_data()
    else:
        logger.info(f"Starting scraper with {CONFIG['MAX_WORKERS']} concurrent workers...")
        scraped_data = scrape_pocket_decks(max_workers=CONFIG['MAX_WORKERS'])
        print_final_results(scraped_data)