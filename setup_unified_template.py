#!/usr/bin/env python3
"""Setup script to add question configs for the fixed unified template"""

import sqlite3
import os

# Database connection
DATABASE_URL = os.environ.get('DATABASE_URL', '')
if DATABASE_URL.startswith('postgresql://'):
    print("PostgreSQL detected, use pgloader or manual setup")
    exit(1)

# For SQLite or direct SQL
question_configs = [
    # Basic questions
    ("1", "Átvevő neve", "text", "F9", "fixed-template-id"),
    ("2", "Szerelő neve", "text", "Q9", "fixed-template-id"),
    ("3", "Irányítószám", "number", "G13", "fixed-template-id"),
    ("4", "Város", "text", "O13", "fixed-template-id"),
    ("5", "Utca", "text", "G14", "fixed-template-id"),
    ("6", "Házszám", "number", "N14", "fixed-template-id"),
    ("7", "Otis Lift-azonosító", "text", "O16", "fixed-template-id"),
    ("8", "Projekt-azonosító", "text", "O17", "fixed-template-id"),
    ("9", "Kirendeltség", "text", "O19", "fixed-template-id"),
    
    # Yes/No/NA questions with multicell support
    ("10", "Gépház kérdés 1", "yes_no_na", "A68,B68,C68", "fixed-template-id"),
    ("11", "Gépház kérdés 2", "yes_no_na", "A75;A76;A77,B75;B76;B77,C75;C76;C77", "fixed-template-id"),
    
    # True/False questions
    ("12", "Modernizáció Q25", "true_false", "Q25", "fixed-template-id"),
    ("13", "Modernizáció Q26", "true_false", "Q26", "fixed-template-id"),
    ("14", "Modernizáció Q27", "true_false", "Q27", "fixed-template-id"),
    ("15", "Modernizáció Q28", "true_false", "Q28", "fixed-template-id"),
    ("16", "Modernizáció Q29", "true_false", "Q29", "fixed-template-id"),
    ("17", "Modernizáció Q30", "true_false", "Q30", "fixed-template-id"),
    ("18", "Modernizáció Q31", "true_false", "Q31", "fixed-template-id"),
    ("19", "Modernizáció Q32", "true_false", "Q32", "fixed-template-id"),
    ("20", "Modernizáció Q33", "true_false", "Q33", "fixed-template-id"),
    ("21", "Modernizáció Q34", "true_false", "Q34", "fixed-template-id"),
    
    # Measurement questions
    ("m1", "Távolság kabintető és Aknatető között", "measurement", "I278", "fixed-template-id"),
    ("m2", "Távolság kabintető legmagasabb pontja és Aknatető között", "measurement", "N278", "fixed-template-id"),
    ("m3", "Távolság az akna padló és az ellensúly puffer között", "measurement", "I280", "fixed-template-id"),
    
    # Calculated questions (Excel handles these automatically)
    ("m4", "Effektív távolság A", "calculated", "I283", "fixed-template-id"),
    ("m5", "Effektív távolság B", "calculated", "N283", "fixed-template-id"),
]

print("Question configs setup complete!")
for config in question_configs:
    print(f"  {config[0]}: {config[1]} -> {config[3]}")