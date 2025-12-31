import os
import sys
import ssl
import time
import json
import re
from urllib.parse import urljoin
from bs4 import BeautifulSoup
import argparse
import platform
import random

# Parse Arguments
parser = argparse.ArgumentParser()
parser.add_argument('--limit', type=int, default=1000, help='Campaign limit')
args, unknown = parser.parse_known_args()
CAMPAIGN_LIMIT = args.limit

BASE_URL = "https://www.maximum.com.tr"
CAMPAIGNS_URL = "https://www.maximum.com.tr/kampanyalar"
OUTPUT_FILE = "maximum_campaigns_full.json"

# SSL FIX
try:
    _create_unverified_https_context = ssl._create_unverified_context
except AttributeError:
    pass
else:
    ssl._create_default_https_context = _create_unverified_https_context

if sys.version_info >= (3, 12):
    try:
        import setuptools
        from setuptools import _distutils
        sys.modules["distutils"] = _distutils
    except ImportError:
        pass

import undetected_chromedriver as uc
from selenium.webdriver.common.by import By

def extract_campaign_details(driver, url):
    """Extract full campaign details from detail page"""
    try:
        driver.get(url)
        time.sleep(3)
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        
        # Title
        title_el = soup.find('h1', class_='gradient-title-text') or soup.find('h1')
        title = title_el.text.strip() if title_el else 'Başlıksız'
        
        # Image - Try multiple selectors
        image = None
        
        # Try og:image
        og_img = soup.find('meta', property='og:image')
        if og_img and og_img.get('content'):
            image = og_img['content']
        
        # Try campaign image
        if not image:
            img_el = soup.find('img', id=re.compile('CampaignImage|campaignImage', re.I))
            if img_el:
                image = img_el.get('src') or img_el.get('data-src')
        
        # Try any large image
        if not image:
            img_el = soup.select_one('.campaign-content img, .campaign-detail img, article img')
            if img_el:
                image = img_el.get('src') or img_el.get('data-src')
        
        # Make absolute
        if image and not image.startswith('http'):
            image = urljoin(BASE_URL, image)
        
        # Filter favicon/logo
        if image and any(x in image.lower() for x in ['favicon', 'logo.svg', 'menu']):
            image = None
        
        # Description
        desc_el = soup.find('span', id=re.compile('CampaignDescription'))
        description = desc_el.text.strip() if desc_el else ''
        
        return {
            "url": url,
            "title": title,
            "image": image,
            "description": description,
            "raw_html": str(soup)[:5000]  # First 5000 chars for AI
        }
    except Exception as e:
        print(f"      ❌ Error extracting {url}: {e}")
        return None

def main():
    print(f"🚀 Maximum Full Scraper (Python + Selenium)...")
    
    driver = None
    try:
        # Chrome Options
        options = uc.ChromeOptions()
        options.add_argument("--no-first-run")
        options.add_argument("--password-store=basic")
        options.add_argument('--ignore-certificate-errors')
        options.add_argument("--window-position=-10000,0") 
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--disable-gpu")
        options.add_argument("--disable-popup-blocking")
        options.add_argument("--disable-notifications")
        options.add_argument("--disable-blink-features=AutomationControlled")
        
        # Random User Agent
        ua_list = [
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36"
        ]
        options.add_argument(f"--user-agent={random.choice(ua_list)}")
        
        # OS Detection
        system_os = platform.system()
        use_sub = True
        
        if system_os == "Darwin":
            use_sub = False
            print("   🍏 MacOS detected: Subprocess mode OFF")
            options.add_argument("--disable-backgrounding-occluded-windows")
            options.add_argument("--disable-renderer-backgrounding")
            options.add_argument("--disable-extensions")
            options.add_argument("--disable-plugins")
        else:
            print(f"   🐧 {system_os} detected: Subprocess mode ON")

        driver = uc.Chrome(options=options, use_subprocess=use_sub)
        driver.set_page_load_timeout(120)
        
        print("   -> Connecting to list page...")
        driver.get(CAMPAIGNS_URL)
        time.sleep(7)
        
        # Infinite scroll
        last_height = driver.execute_script("return document.body.scrollHeight")
        for _ in range(5):
            try:
                btn = driver.find_element(By.XPATH, "//button[contains(text(), 'Daha Fazla')]")
                driver.execute_script("arguments[0].scrollIntoView(true);", btn)
                time.sleep(1.5)
                driver.execute_script("arguments[0].click();", btn)
                time.sleep(3)
                
                new_height = driver.execute_script("return document.body.scrollHeight")
                if new_height == last_height: break
                last_height = new_height
            except:
                break
        print("      List loaded.")
        
        soup = BeautifulSoup(driver.page_source, 'html.parser')
        all_links = []
        for a in soup.find_all('a', href=True):
            if "/kampanyalar/" in a['href'] and "arsiv" not in a['href'] and len(a['href']) > 25:
                all_links.append(urljoin(BASE_URL, a['href']))
        
        unique_links = list(set(all_links))[:CAMPAIGN_LIMIT]
        print(f"   -> Found {len(unique_links)} campaign links.")
        
        # Extract full details
        campaigns = []
        for i, url in enumerate(unique_links, 1):
            print(f"   [{i}/{len(unique_links)}] Processing {url.split('/')[-1][:40]}...")
            details = extract_campaign_details(driver, url)
            if details:
                campaigns.append(details)
            time.sleep(2)  # Rate limit
        
        # Save
        with open(OUTPUT_FILE, 'w', encoding='utf-8') as f:
            json.dump(campaigns, f, ensure_ascii=False, indent=2)
            
        print(f"\n✅ DONE! {len(campaigns)} campaigns saved to {OUTPUT_FILE}")

    except Exception as main_e:
        print(f"❌ Critical Error: {main_e}")
    finally:
        if driver: 
            try: driver.quit()
            except: pass

if __name__ == "__main__":
    main()
