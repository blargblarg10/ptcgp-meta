"""
Limitless TCG Card Scraper
This script will scrape card information from pocket.limitlesstcg.com
"""

import logging
from concurrent.futures import ThreadPoolExecutor, as_completed
import time
import os
import sys
import json
import argparse
import pandas as pd
from selenium import webdriver
from selenium.webdriver.edge.service import Service
from selenium.webdriver.edge.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
import requests
import pathlib
import re

# Get the script's directory
SCRIPT_DIR = pathlib.Path(__file__).parent.resolve()

# Configuration
CONFIG = {
    'info': False,
    'OUTPUT_FILE': "./src/data/card_data.json",
    'ICON_FOLDER': "./public/icons/",
    'ICON_WEBPATH': "./icons/",
    'LOG_FILE': os.path.join(SCRIPT_DIR, 'scraper.log'),
    'CARD_URL': "https://pocket.limitlesstcg.com/cards/",
    'CARD_ICON_URL': "https://r2.limitlesstcg.net/pokemon/gen9/",
    'MAX_WORKERS': 10,
    'WEBDRIVER_OPTIONS': {
        'headless': True,
        'log_level': 'OFF',
        'silent': True
    }
}

# Ensure log directory exists
os.makedirs(SCRIPT_DIR, exist_ok=True)
# Ensure icon directory exists
os.makedirs(CONFIG['ICON_FOLDER'], exist_ok=True)

# Logging configuration
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler(CONFIG['LOG_FILE'], mode='w', encoding='utf-8')
    ]
)
logger = logging.getLogger('CardScraper')

class CardDatabase:
    def __init__(self, reset=False):
        self.reset = reset
        self.df = pd.DataFrame(columns=[
            '_id', 'setNumber', 'setName', 'cardNumber', 
            'cardName', 'cardElement', 'cardType', 'cardSubtype',
            'evolvesFrom', 'webLink', 'iconPath', 'finalEvolution'
        ])
        self.df.set_index('_id', inplace=True)
        
    @staticmethod
    def generate_card_key(set_number, card_number):
        """Generate a consistent key format for card identification"""
        return f"{set_number}-{card_number}"

    def load_existing_data(self):
        """Load existing card data from JSON if it exists"""
        try:
            if self.reset:
                logger.info("Reset flag is set. Starting fresh.")
                if os.path.exists(CONFIG['OUTPUT_FILE']):
                    os.remove(CONFIG['OUTPUT_FILE'])
                return

            if os.path.exists(CONFIG['OUTPUT_FILE']):
                with open(CONFIG['OUTPUT_FILE'], 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    cards_data = data.get('cards', data)
                    
                    # Convert dict to DataFrame
                    df_data = []
                    for key, card in cards_data.items():
                        card['_id'] = key
                        df_data.append(card)
                    
                    if df_data:
                        self.df = pd.DataFrame(df_data)
                        self.df.set_index('_id', inplace=True)
                    
                logger.info(f"Loaded {len(self.df)} existing cards from JSON")
            else:
                logger.info("No existing data found. Starting fresh.")
        except Exception as e:
            logger.error(f"Error loading existing data: {e}")

    def card_exists(self, set_number, card_number):
        """Check if a card already exists in the database"""
        key = self.generate_card_key(set_number, card_number)
        try:
            return key in self.df.index
        except Exception as e:
            logger.error(f"Error checking if card exists {key}: {str(e)}")
            return False

    def get_card(self, set_number, card_number):
        """Get a card from the database"""
        key = self.generate_card_key(set_number, card_number)
        try:
            if key in self.df.index:
                return self.df.loc[key].to_dict()
            return None
        except Exception as e:
            logger.error(f"Error getting card {key}: {str(e)}")
            return None

    def save_data_to_json(self):
        """Save the database contents to a JSON file"""
        try:
            # Convert DataFrame to dict format
            cards_dict = {}
            sorted_indices = sorted(self.df.index, key=lambda x: (
                x.split('-')[0],  # Sort by set number first
                int(x.split('-')[1])  # Then sort by card number as integer
            ))
            
            for idx in sorted_indices:
                cards_dict[idx] = self.df.loc[idx].to_dict()
            
            output_data = {"cards": cards_dict}
            
            # Create directory if it doesn't exist
            os.makedirs(os.path.dirname(CONFIG['OUTPUT_FILE']), exist_ok=True)
            
            with open(CONFIG['OUTPUT_FILE'], 'w', encoding='utf-8') as f:
                json.dump(output_data, f, indent=2, ensure_ascii=False)
            logger.info(f"Data saved to {CONFIG['OUTPUT_FILE']}")
        except Exception as e:
            logger.error(f"Error saving data to JSON: {e}")

    def upsert_card(self, card_info):
        """Insert or update card information in the database"""
        try:
            card_id = card_info.pop('_id')
            self.df.loc[card_id] = pd.Series(card_info)
        except Exception as e:
            logger.error(f"Error upserting card {card_info.get('_id')}: {str(e)}")

    def process_final_evolutions(self):
        """Process all cards to determine if they are final evolutions"""
        try:
            # Get all cards that are evolved from
            evolved_from_cards = set(self.df[self.df['evolvesFrom'].notna()]['evolvesFrom'])
            
            # Mark final evolution status
            self.df['finalEvolution'] = ~self.df['cardName'].isin(evolved_from_cards)
            
            logger.info("Processed final evolution status")
            self.save_data_to_json()
            return True
        except Exception as e:
            logger.error(f"Error processing final evolutions: {e}")
            return False

class CardScraper:
    def __init__(self, database):
        self.database = database
        self.max_retries = 3
        self.retry_delay = 2  # seconds
        
    def create_new_driver(self):
        """Creates a new WebDriver instance."""
        edge_options = Options()
        edge_options.add_argument("--headless")
        edge_options.add_argument("--log-level=OFF")
        edge_options.add_argument("--silent")
        edge_options.add_experimental_option('excludeSwitches', ['enable-logging'])
        edge_options.add_experimental_option('detach', True)
        service = Service(log_path=os.devnull)
        return webdriver.Edge(service=service, options=edge_options)

    def download_card_icon(self, card_name):
        """Downloads the icon for a given card name if it doesn't exist."""
        # Get card name and convert to lowercase
        card_name_lower = card_name.strip().lower()
        name_parts = card_name_lower.split()

        # Remove 'ex' from the end of the card name if it exists
        if len(name_parts) >= 2 and name_parts[-1].lower() == 'ex':
            card_name_lower = ' '.join(name_parts[:-1])

        # Remove all spaces from the card name
        card_name_lower = card_name_lower.replace(" ", "")

        # Replace periods with hyphens
        card_name_lower = card_name_lower.replace(".", "-")

        # Remove a list of words from the card name 
        remove_words = ["paldean"]
        for word in remove_words:   
            card_name_lower = card_name_lower.replace(word, "")

        # Create paths
        icon_url = f"{CONFIG['CARD_ICON_URL']}{card_name_lower}.png"
        icon_path = os.path.join(CONFIG['ICON_FOLDER'], f"{card_name_lower}.png")
        icon_web_path = os.path.join(CONFIG['ICON_WEBPATH'], f"{card_name_lower}.png")

        # Check if image already exists locally
        if os.path.exists(icon_path):
            logger.info(f"Image already exists for {card_name}")
            return icon_web_path

        # Check if the image exists at url
        response = requests.head(icon_url)
        if response.status_code == 200:
            # Download the image
            img_response = requests.get(icon_url)
            with open(icon_path, 'wb') as f:
                f.write(img_response.content)
            logger.info(f"Downloaded card image for {card_name}")
            return icon_web_path
        else:
            logger.info(f"No image found for {card_name}")
            return None

    def retrieve_missing_icons(self):
        """Loads existing card data and attempts to download missing icons."""
        logger.info("Starting icon retrieval for cards with missing icons...")
        
        try:
            # Load existing card data
            with open(CONFIG['OUTPUT_FILE'], 'r', encoding='utf-8') as f:
                data = json.load(f)
                cards_data = data.get('cards', {})

            updated_count = 0
            for card_id, card_info in cards_data.items():
                if card_info.get('cardType') == 'Pokémon':
                    if not card_info.get('iconPath'):
                        # Attempt to download icon
                        logger.info(f"Attempt to retreive icon for {card_info['cardName']}")
                        icon_path = self.download_card_icon(card_info['cardName'])
                        if icon_path:
                            cards_data[card_id]['iconPath'] = icon_path
                            updated_count += 1
                    else:
                        logger.info(f"Icon already exists for {card_info['cardName']}")
                else:
                    logger.info(f"Not attempting icon for a non-Pokemon card - {card_info['cardName']}")

            # Save updated data
            if updated_count > 0:
                with open(CONFIG['OUTPUT_FILE'], 'w', encoding='utf-8') as f:
                    json.dump({"cards": cards_data}, f, indent=2, ensure_ascii=False)
                logger.info(f"Updated {updated_count} cards with new icons")
            else:
                logger.info("No new icons were added")

            return True
        except Exception as e:
            logger.error(f"Error during icon retrieval: {e}")
            return False

    def scrape_card_info(self, url, set_code, set_name):
        """Worker function that scrapes a single card's information."""
        if not url:
            logger.error("Empty URL provided")
            return None
            
        driver = None
        try:
            # Parse URL for card identification
            try:
                path_parts = url.split('/')
                if len(path_parts) < 2:
                    raise ValueError(f"Invalid URL format: {url}")
                set_number = path_parts[-2]
                card_number = path_parts[-1]
            except Exception as e:
                logger.error(f"URL parsing error: {url} - {str(e)}")
                return None
            
            # Check existing card
            if self.database.card_exists(set_number, card_number):
                card_key = self.database.generate_card_key(set_number, card_number)
                card = self.database.get_card(set_number, card_number)
                logger.info(f"Card {card_key} ({card['cardName']}): already exists, skipping...")
                return None

            # Initialize webdriver
            try:
                driver = self.create_new_driver()
                driver.get(url)
            except Exception as e:
                logger.error(f"Browser initialization error for {url}: {str(e)}")
                return None
            
            # Wait for and verify page load
            try:
                WebDriverWait(driver, 10).until(
                    EC.presence_of_element_located((By.CLASS_NAME, "card-text"))
                )
            except Exception as e:
                logger.error(f"Page load timeout for {url}: {str(e)}")
                return None

            if "Error" in driver.title or "404" in driver.title:
                logger.error(f"Page not found or error page: {url}")
                return None

            # Check if card is a diamond card
            try:
                prints_details = driver.find_element(By.CLASS_NAME, "prints-current-details")
                if "◊" not in prints_details.text:
                    logger.info(f"Not a diamond card at {url}")
                    return None
            except Exception as e:
                logger.error(f"Failed to check diamond status for {url}: {str(e)}")
                return None
            
            # Get card name (required)
            try:
                name_element = driver.find_element(By.CLASS_NAME, "card-text-name")
                card_name = name_element.text.strip()
                if not card_name:
                    logger.error(f"Empty card name at {url}")
                    return None
            except Exception as e:
                logger.error(f"Failed to get card name at {url}: {str(e)}")
                return None
            
            # Get card type (optional)
            try:
                type_text = driver.find_element(By.CLASS_NAME, "card-text-title").text
                card_element = re.split(r'\s*-\s*', type_text)[1].strip()
            except Exception as e:
                logger.warning(f"Could not get card type for {card_name} at {url}: {str(e)}")
                card_element = ""
                
            # Get type and subtype
            try:
                stage_text = driver.find_element(By.CLASS_NAME, "card-text-type").text
                evolves_from = ""
                if "Evolves from" in stage_text:
                    evolves_from = stage_text.split("Evolves from")[1].split()[0].strip()
                card_type = stage_text.split(' - ')[0].strip() if '-' in stage_text else ""
                card_subtype = re.split(r'\s*-\s*', stage_text)[1].strip()
            except Exception as e:
                logger.warning(f"Could not get evolution info for {card_name} at {url}: {str(e)}")
                card_type = ""
                card_subtype = ""
                evolves_from = ""
            
            # Try to download card icon if it is a Pokémon card
            if card_type == "Pokémon":
                icon_path = self.download_card_icon(card_name)

            # Create and save card info
            try:
                card_info = {
                    "_id": self.database.generate_card_key(set_number, card_number),
                    "setNumber": set_number,
                    "setName": set_name,
                    "cardNumber": card_number,
                    "cardName": card_name,
                    "cardElement": card_element,
                    "cardType": card_type,
                    "cardSubtype": card_subtype,
                    "evolvesFrom": evolves_from,
                    "webLink": driver.current_url,
                    "iconPath": icon_path,
                    "finalEvolution": False
                }
                
                logger.info(f"Scraped card: {card_info["cardName"]} - ({card_info["_id"]})")
                self.database.upsert_card(card_info)
                return card_info
            except Exception as e:
                logger.error(f"Failed to save card info for {card_name} at {url}: {str(e)}")
                return None
                
        except Exception as e:
            logger.error(f"Unexpected error scraping card at {url}: {str(e)}")
            return None
        finally:
            if driver:
                try:
                    driver.quit()
                except Exception as e:
                    logger.warning(f"Failed to close browser for {url}: {str(e)}")

    def scrape_set_info(self, driver):
        """Gathers set information from the main page."""
        logger.info("Gathering set information...")
        WebDriverWait(driver, 30).until(
            EC.presence_of_element_located((By.CSS_SELECTOR, "table tbody tr"))
        )
        
        rows = driver.find_elements(By.CSS_SELECTOR, "table tbody tr")
        set_links = []
        
        for row in rows:
            try:
                link_element = row.find_element(By.CSS_SELECTOR, "td:first-child a")
                url = link_element.get_attribute("href")
                set_code = url.split('/')[-1]
                set_name = link_element.text.split('\n')[0].strip()
                set_links.append({
                    "url": url, 
                    "setCode": set_code,
                    "setName": set_name
                })
            except Exception as e:
                logger.error(f"Error processing set row: {e}")
                continue
        
        logger.info(f"Found {len(set_links)} sets")
        return set_links

    def run(self):
        """Main function to scrape card data with parallel processing."""
        start_time = time.time()
        main_driver = None
        
        try:
            logger.info("Loading existing card data...")
            self.database.load_existing_data()
            
            logger.info("Initializing scraper...")
            main_driver = self.create_new_driver()
            main_driver.get(CONFIG['CARD_URL'])
            
            set_links = self.scrape_set_info(main_driver)
            
            for i, set_link in enumerate(set_links, 1):
                logger.info(f"Processing set {i}/{len(set_links)}: {set_link['setName']} ({set_link['setCode']})")
                
                main_driver.get(set_link['url'])
                WebDriverWait(main_driver, 10).until(
                    EC.presence_of_element_located((By.CSS_SELECTOR, ".card-search-grid a"))
                )
                
                card_elements = main_driver.find_elements(By.CSS_SELECTOR, ".card-search-grid a")
                card_links = [elem.get_attribute("href") for elem in card_elements]
                logger.info(f"Found {len(card_links)} cards in set {set_link['setCode']}")
                
                with ThreadPoolExecutor(max_workers=CONFIG['MAX_WORKERS']) as executor:
                    future_to_url = {
                        executor.submit(self.scrape_card_info, url, set_link['setCode'], set_link['setName']): url
                        for url in card_links
                    }
                    
                    completed = 0
                    for future in as_completed(future_to_url):
                        completed += 1
                        logger.info(f"Progress: {completed}/{len(card_links)} cards processed")
            
            self.database.save_data_to_json()
            
            # Process final evolutions after scraping
            logger.info("Processing final evolution status...")
            self.database.process_final_evolutions()
            
            end_time = time.time()
            elapsed_time = end_time - start_time
            logger.info(f"Script execution time: {elapsed_time/60:.2f} minutes")
            return True
            
        except Exception as e:
            logger.error(f"An error occurred during main scraping: {e}")
            return False
        finally:
            if main_driver:
                main_driver.quit()

def main():
    # Set up argument parser
    parser = argparse.ArgumentParser(description='Scrape card data from Limitless TCG')
    parser.add_argument('--reset', action='store_true', default=False,
                       help='Reset the database and ignore existing data')
    parser.add_argument('--icons-only', action='store_true', default=False,
                       help='Only retrieve missing icons for existing card data')
    args = parser.parse_args()

    logger.info(f"Starting scraper with {CONFIG['MAX_WORKERS']} concurrent workers...")
    
    database = CardDatabase(reset=args.reset)
    scraper = CardScraper(database)
    
    if args.icons_only:
        logger.info("Running in icons-only mode")
        success = scraper.retrieve_missing_icons()
    else:
        if args.reset:
            logger.info("Reset mode enabled - existing data will be ignored")
        success = scraper.run()
    
    if success:
        logger.info("Operation completed successfully")

if __name__ == "__main__":
    main()