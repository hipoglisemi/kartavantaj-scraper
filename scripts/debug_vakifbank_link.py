#!/usr/bin/env python3
"""
Debug script to inspect Vakıfbank campaign detail page and find the campaign link
"""

import ssl
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from bs4 import BeautifulSoup
import time

ssl._create_default_https_context = ssl._create_unverified_context

# Test URL - using an actual campaign from scraped data
TEST_URL = "https://www.vakifkart.com.tr/kampanyalar/yapi-market-beyaz-esya-ve-mobilya-alisverisinize-500-tl-worldpuan-39483"

def get_driver():
    options = Options()
    # Run in visible mode to see what's happening
    # options.add_argument("--headless=new")
    options.add_argument("--window-size=1920,1080")
    options.add_argument("--disable-popup-blocking")
    
    service = Service(ChromeDriverManager().install())
    driver = webdriver.Chrome(service=service, options=options)
    return driver

def debug_detail_page():
    driver = get_driver()
    
    try:
        print(f"🔍 Loading: {TEST_URL}")
        driver.get(TEST_URL)
        
        # Wait for page load
        time.sleep(3)
        
        # Try to find the button
        print("\n📍 Looking for 'Kampanyaya Katıl' button...")
        
        # Check various possible selectors
        selectors = [
            "a.kampanyaKatilBtn",
            "button.kampanyaKatilBtn",
            ".kampanyaKatilBtn",
            "a[href*='kampanya']",
            "button[onclick*='kampanya']",
            ".contentSide a",
            ".kampanyaDetay a",
        ]
        
        for selector in selectors:
            try:
                elements = driver.find_elements(By.CSS_SELECTOR, selector)
                if elements:
                    print(f"\n✅ Found with selector: {selector}")
                    for i, elem in enumerate(elements):
                        print(f"   Element {i+1}:")
                        print(f"      Tag: {elem.tag_name}")
                        print(f"      Text: {elem.text[:50] if elem.text else 'N/A'}")
                        href = elem.get_attribute('href')
                        onclick = elem.get_attribute('onclick')
                        if href:
                            print(f"      href: {href}")
                        if onclick:
                            print(f"      onclick: {onclick}")
            except Exception as e:
                print(f"   ⚠️ Error with {selector}: {e}")
        
        # Parse with BeautifulSoup
        print("\n📄 Parsing HTML with BeautifulSoup...")
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Look for all links
        all_links = soup.find_all('a')
        print(f"\n🔗 Found {len(all_links)} total links")
        
        # Filter for campaign-related links
        campaign_links = [
            a for a in all_links 
            if a.get('href') and ('kampanya' in a.get('href', '').lower() or 'katil' in a.get_text().lower())
        ]
        
        print(f"\n🎯 Campaign-related links ({len(campaign_links)}):")
        for i, link in enumerate(campaign_links):
            print(f"   {i+1}. Text: {link.get_text(strip=True)[:50]}")
            print(f"      href: {link.get('href')}")
            print(f"      class: {link.get('class')}")
        
        # Save HTML for inspection
        with open('vakifbank_detail_debug.html', 'w', encoding='utf-8') as f:
            f.write(driver.page_source)
        print("\n💾 Saved HTML to vakifbank_detail_debug.html")
        
        # Keep browser open for manual inspection
        print("\n⏸️ Browser will stay open for 30 seconds for manual inspection...")
        time.sleep(30)
        
    finally:
        driver.quit()

if __name__ == "__main__":
    debug_detail_page()
