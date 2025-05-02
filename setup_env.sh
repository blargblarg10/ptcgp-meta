#!/bin/bash
# Get the absolute path of the current directory
CURRENT_DIR=$PWD

# Check if the current directory contains .git directory
if [ ! -d "$CURRENT_DIR/.git" ]; then
    echo "Error: This script must be run from a directory containing a .git directory."
    echo "Current directory: $CURRENT_DIR"
    ls -la "$CURRENT_DIR"
    exit 1
fi

# Check if Python is installed
if ! command -v python >/dev/null 2>&1; then
    echo "Error: Python is not installed"
    exit 1
fi

# Check if the virtual environment exists
if [ -d "$CURRENT_DIR/.venv" ]; then
    echo "Python virtual environment already exists."
else
    # Create the virtual environment
    echo "Creating Python virtual environment..."
    python -m venv "$CURRENT_DIR/.venv"
fi

# Activate virtual environment
if [ -f "$CURRENT_DIR/.venv/bin/activate" ]; then
    source $CURRENT_DIR/.venv/bin/activate
elif [ -f "$CURRENT_DIR/.venv/Scripts/activate" ]; then
    source $CURRENT_DIR/.venv/Scripts/activate
else
    echo "Activation script not found"
    exit 1
fi

# Install project specific packages from python_requirements.txt if it exists
if [ -f "$CURRENT_DIR/python_requirements.txt" ]; then
    echo "Installing project specific packages..."
    pip install -r "$CURRENT_DIR/python_requirements.txt"
else
    echo "No python_requirements.txt file found. Skipping installation of project specific packages."
fi

#aliases
alias ll='ls -la'
alias gits='git status'

echo "Python virtual environment is activated and ready."

export PATH=$CURRENT_DIR:$PATH
export PATH="$CURRENT_DIR/scripts":$PATH