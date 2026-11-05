#!/usr/bin/env python3
"""
Google Form Automated Response Generator
Target Form: Plant Survivability / Gardening Survey
Endpoint: https://docs.google.com/forms/d/e/1FAIpQLSeAIdhUJhjQzx91ujH_mCuNmF_lorzCsmRbekvo_uzmjWeNFA/formResponse

Distributes realistic, human-like survey responses with:
- Age: 20-50 years
- Occupation: Employed / Self-employed
- Cities: 20-30% Dehradun, 70-80% uncommon Tier-2 / Tier-3 cities across India
- Gardening experience: < 3 years
- Plant count: Proportional (mostly 6-10, some 1-5, few 11-20)
- High correlation on having lost plants (mostly Yes) and difficulty diagnosing issues
"""

import sys
import time
import json
import random
import os
import argparse
from datetime import datetime, timezone, timedelta
import urllib.request
import urllib.parse

# Set stdout encoding to utf-8 for Windows PowerShell / Terminal
sys.stdout.reconfigure(encoding='utf-8')

FORM_URL = "https://docs.google.com/forms/d/e/1FAIpQLSeAIdhUJhjQzx91ujH_mCuNmF_lorzCsmRbekvo_uzmjWeNFA/formResponse"

# Indian Standard Time (UTC+5:30)
IST = timezone(timedelta(hours=5, minutes=30))

# Diverse User-Agents (Windows, Mac, Linux, Android, iOS)
USER_AGENTS = [
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36 Edg/121.0.0.0",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 14_3_1) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.3 Safari/605.1.15",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:123.0) Gecko/20100101 Firefox/123.0",
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.64 Mobile Safari/537.36",
    "Mozilla/5.0 (Linux; Android 13; Pixel 7 Pro) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.6167.143 Mobile Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_3_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 13; OnePlus 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    "Mozilla/5.0 (Linux; Android 12; Redmi Note 11) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Mobile Safari/537.36",
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36",
    "Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/122.0.6261.62 Mobile/15E148 Safari/604.1",
    "Mozilla/5.0 (Linux; Android 14; vivo X100) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Mobile Safari/537.36"
]

# Dehradun variations for 20-30% frequency
DEHRADUN_VARIATIONS = [
    "Dehradun",
    "Dehradun",
    "Dehradun, Uttarakhand",
    "Dehradun",
    "Dehradun",
    "Dehra Dun",
    "dehradun",
    "Dehradun (UK)"
]

# Uncommon Tier-2 and Tier-3 cities across various Indian states
UNCOMMON_INDIAN_CITIES = [
    # Uttarakhand & Himachal
    "Rishikesh", "Haridwar", "Haldwani", "Roorkee", "Almora", "Kotdwar", "Nainital",
    "Solan", "Dharamshala", "Mandi", "Palampur", "Kullu", "Shimla",
    # Uttar Pradesh
    "Saharanpur", "Bareilly", "Moradabad", "Aligarh", "Jhansi", "Gorakhpur", 
    "Muzaffarnagar", "Mathura", "Firozabad", "Meerut",
    # Rajasthan
    "Udaipur", "Ajmer", "Bikaner", "Bhilwara", "Alwar", "Sikar", "Pali", "Chittorgarh", "Kota",
    # Madhya Pradesh
    "Gwalior", "Jabalpur", "Ujjain", "Sagar", "Rewa", "Ratlam", "Satna", "Dewas",
    # Bihar & Jharkhand
    "Muzaffarpur", "Bhagalpur", "Darbhanga", "Gaya", "Dhanbad", "Bokaro", "Hazaribagh", "Deoghar",
    # Punjab & Haryana
    "Hoshiarpur", "Bathinda", "Pathankot", "Yamunanagar", "Karnal", "Kurukshetra", "Ambala", "Sonipat",
    # Gujarat
    "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Anand", "Navsari", "Gandhinagar", "Mehsana",
    # Maharashtra
    "Nashik", "Kolhapur", "Solapur", "Amravati", "Sangli", "Jalgaon", "Akola", "Latur", "Dhule", "Ahmednagar",
    # Odisha & West Bengal
    "Cuttack", "Rourkela", "Sambalpur", "Berhampur", "Balasore",
    "Siliguri", "Asansol", "Durgapur", "Kharagpur", "Bardhaman", "Jalpaiguri",
    # South India (Karnataka, AP, Telangana, TN, Kerala)
    "Belagavi", "Hubballi", "Davanagere", "Shivamogga", "Mangaluru", "Udupi", "Tumakuru",
    "Warangal", "Nizamabad", "Karimnagar", "Khammam",
    "Tirupati", "Rajahmundry", "Kakinada", "Nellore", "Kadapa", "Kurnool", "Guntur",
    "Salem", "Tiruchirappalli", "Tirunelveli", "Vellore", "Erode", "Thanjavur", "Dindigul",
    "Thrissur", "Kozhikode", "Kollam", "Palakkad", "Alappuzha", "Kannur", "Kottayam",
    # Northeast & Central
    "Guwahati", "Dibrugarh", "Silchar", "Tezpur", "Jorhat", "Shillong",
    "Bilaspur", "Korba", "Durg", "Rajnandgaon"
]

def pick_weighted(options_dict):
    """Select an option based on weighted probabilities."""
    items = list(options_dict.keys())
    weights = list(options_dict.values())
    return random.choices(items, weights=weights, k=1)[0]

def pick_multi(options_weights, min_count=2, max_count=4):
    """Pick multiple items based on probability weights."""
    count = random.randint(min_count, max_count)
    chosen = []
    items = list(options_weights.keys())
    weights = list(options_weights.values())
    
    # Sample without replacement using weights
    while len(chosen) < count and len(items) > 0:
        pick = random.choices(items, weights=weights, k=1)[0]
        idx = items.index(pick)
        chosen.append(pick)
        items.pop(idx)
        weights.pop(idx)
        
    return chosen

def generate_city():
    """Returns Dehradun 25% of the time, and uncommon Indian cities 75% of the time."""
    if random.random() < 0.25:
        return random.choice(DEHRADUN_VARIATIONS)
    return random.choice(UNCOMMON_INDIAN_CITIES)

def generate_response_payload():
    """Generates a realistic, coherent survey response adhering to all demographic constraints."""
    
    # 1. Age (20-50 age bracket)
    age = pick_weighted({
        "25–34": 50,
        "18–24": 20,
        "35–44": 20,
        "45–54": 10
    })
    
    # 2. Occupation (Employed)
    occupation = pick_weighted({
        "Employed / नौकरीपेशा": 85,
        "Self-employed / स्वरोज़गार": 15
    })
    
    # 3. City
    city = generate_city()
    
    # 4. Gardening Experience (< 3 years)
    experience = pick_weighted({
        "6 months–1 year / 6 महीने–1 वर्ष": 38,
        "1–2 years / 1–2 वर्ष": 37,
        "Less than 6 months / 6 महीने से कम": 25
    })
    
    # 5. Number of plants (correlated with experience, 6-10 ideal)
    if "Less than 6 months" in experience:
        plants = pick_weighted({
            "1–5": 65,
            "6–10": 35
        })
    elif "6 months–1 year" in experience:
        plants = pick_weighted({
            "6–10": 60,
            "1–5": 30,
            "11–20": 10
        })
    else: # 1-2 years
        plants = pick_weighted({
            "6–10": 60,
            "11–20": 25,
            "1–5": 15
        })
        
    # 6. Where do you mainly grow plants?
    location = pick_weighted({
        "Balcony / बालकनी": 52,
        "Terrace / छत": 24,
        "Indoor / घर के अंदर": 14,
        "Window sill / खिड़की की जगह": 6,
        "Garden / बगीचा": 4
    })
    
    # 7. How often do you take care?
    frequency = pick_weighted({
        "Once a day / दिन में एक बार": 55,
        "A few times a week / सप्ताह में कुछ बार": 35,
        "Once a week / सप्ताह में एक बार": 7,
        "Several times a day / दिन में कई बार": 3
    })
    
    # 8. Confidence in knowing plant needs
    confidence_needs = pick_weighted({
        "Somewhat confident / कुछ हद तक आत्मविश्वास": 50,
        "Somewhat unconfident / कुछ हद तक कम आत्मविश्वास": 35,
        "Very confident / बहुत आत्मविश्वास": 10,
        "Not at all confident / बिल्कुल आत्मविश्वास नहीं": 5
    })
    
    # 9. Difficult parts of plant care (Checkboxes: 2 to 4)
    difficulties = pick_multi({
        "Identifying diseases / बीमारियों की पहचान करना": 70,
        "Knowing what to do when a plant looks unhealthy / पौधा अस्वस्थ दिखने पर क्या करना है": 65,
        "Identifying pests / कीटों की पहचान करना": 55,
        "Knowing how much water to give / कितना पानी देना है यह जानना": 50,
        "Choosing the right fertilizer / सही खाद चुनना": 40,
        "Understanding sunlight requirements / धूप की आवश्यकता समझना": 35,
        "Knowing when and how to fertilize / खाद कब और कैसे देनी है": 30,
        "Knowing when to water / पानी कब देना है यह जानना": 30,
        "Choosing the right soil / सही मिट्टी चुनना": 25,
        "Maintaining a regular care routine / नियमित देखभाल की दिनचर्या बनाए रखना": 25,
        "Choosing the right pot / सही गमला चुनना": 20,
        "Pruning and trimming / छंटाई करना": 15
    }, min_count=2, max_count=4)
    
    # 10. How do you learn plant care? (Checkboxes: 1 to 3)
    learning_sources = pick_multi({
        "YouTube": 75,
        "Google Search / Google पर खोज": 65,
        "Nursery or gardening shop staff / नर्सरी या gardening shop के कर्मचारी": 40,
        "Friends or family / दोस्त या परिवार": 35,
        "Social media / सोशल मीडिया": 30,
        "AI tools such as ChatGPT / ChatGPT जैसे AI tools": 15,
        "Experienced gardeners / अनुभवी माली": 15,
        "Personal experience / व्यक्तिगत अनुभव": 12,
        "Gardening websites or blogs / Gardening websites या blogs": 10
    }, min_count=1, max_count=3)
    
    # 11. Have plants become noticeably unhealthy?
    became_unhealthy = pick_weighted({
        "Yes / हाँ": 90,
        "Not sure / निश्चित नहीं": 7,
        "No / नहीं": 3
    })
    
    # 12. Have you ever lost a plant? (User rule: Most should say YES)
    lost_plant = pick_weighted({
        "Yes / हाँ": 88,
        "No / नहीं": 12
    })
    
    # 13. Main reason if lost plant
    if lost_plant.startswith("Yes"):
        lost_reason = pick_weighted({
            "Overwatering / जरूरत से ज्यादा पानी": 30,
            "Extreme weather / अत्यधिक मौसम": 22,
            "Pest infestation / कीटों का प्रकोप": 18,
            "Underwatering / पर्याप्त पानी न देना": 12,
            "Disease / बीमारी": 10,
            "Lack of nutrients / पोषक तत्वों की कमी": 3,
            "Wrong soil / गलत मिट्टी": 3,
            "Too much sunlight / बहुत अधिक धूप": 2
        })
    else:
        lost_reason = pick_weighted({
            "I don't know / मुझे नहीं पता": 60,
            "Other / अन्य": 40
        })
        
    # 14. Ease of telling if something is wrong
    ease_tell = pick_weighted({
        "Somewhat difficult / कुछ हद तक कठिन": 46,
        "Neither easy nor difficult / न आसान न कठिन": 26,
        "Somewhat easy / कुछ हद तक आसान": 18,
        "Very difficult / बहुत कठिन": 10
    })
    
    # 15. Confidence in identifying cause
    conf_cause = pick_weighted({
        "Somewhat unconfident / कुछ हद तक कम आत्मविश्वास": 50,
        "Neither confident nor unconfident / न आत्मविश्वास न असमंजस": 25,
        "Somewhat confident / कुछ हद तक आत्मविश्वास": 15,
        "Not at all confident / बिल्कुल आत्मविश्वास नहीं": 10
    })
    
    # 16. Noticed problem but didn't know cause
    not_known_cause = pick_weighted({
        "Yes / हाँ": 85,
        "Not sure / निश्चित नहीं": 10,
        "No / नहीं": 5
    })
    
    # 17. Mistaken one problem for another
    mistaken_problem = pick_weighted({
        "Yes / हाँ": 78,
        "Not sure / निश्चित नहीं": 14,
        "No / नहीं": 8
    })
    
    # 18. Realized serious damage only after significant
    damage_significant = pick_weighted({
        "Yes / हाँ": 82,
        "Not sure / निश्चित नहीं": 12,
        "No / नहीं": 6
    })
    
    # 19. What happens when first notice unusual?
    first_notice = pick_weighted({
        "I search online / मैं इंटरनेट पर खोज करता हूँ": 45,
        "I try to identify the problem myself / मैं खुद समस्या पहचानने की कोशिश करता हूँ": 25,
        "I visit a nursery or gardening shop / मैं नर्सरी या gardening shop जाता हूँ": 12,
        "I ask a friend or family member / मैं दोस्त या परिवार से पूछता हूँ": 10,
        "I wait and see if it gets better / मैं इंतजार करता हूँ कि स्थिति बेहतर होती है या नहीं": 5,
        "I use an AI tool / मैं AI tool का उपयोग करता हूँ": 3
    })
    
    # 20. What info is most difficult to get? (Checkboxes: 2 to 4)
    info_difficult = pick_multi({
        "What exactly is wrong with the plant / पौधे में वास्तव में क्या समस्या है": 75,
        "What action I should take immediately / मुझे तुरंत क्या करना चाहिए": 65,
        "What caused the problem / समस्या किस कारण हुई": 60,
        "How serious the problem is / समस्या कितनी गंभीर है": 50,
        "How to prevent the problem from happening again / समस्या दोबारा होने से कैसे रोकें": 45,
        "Which fertilizer or treatment to use / कौन-सी खाद या treatment इस्तेमाल करनी है": 35,
        "How much water the plant needs / पौधे को कितना पानी चाहिए": 30,
        "How often to perform the treatment / treatment कितनी बार करनी है": 25,
        "How much sunlight it needs / उसे कितनी धूप चाहिए": 20
    }, min_count=2, max_count=4)
    
    # 21. What would make you feel more confident? (Checkboxes: 2 to 5)
    confident_features = pick_multi({
        "Easy plant problem identification / पौधों की समस्या की आसान पहचान": 80,
        "Early warnings when something may be wrong / समस्या होने से पहले चेतावनी": 75,
        "Step-by-step solutions / चरण-दर-चरण समाधान": 70,
        "Weather-based recommendations / मौसम के आधार पर सुझाव": 65,
        "Clear watering reminders / स्पष्ट पानी देने के reminders": 50,
        "Personalized care instructions / व्यक्तिगत देखभाल के निर्देश": 50,
        "Information specific to my plant / मेरे पौधे के अनुसार जानकारी": 45,
        "Knowing how serious a problem is / समस्या कितनी गंभीर है यह जानना": 40,
        "Reminders for fertilizer and other treatments / खाद और अन्य treatments के reminders": 35,
        "A record of my plant's health / मेरे पौधे के स्वास्थ्य का record": 30
    }, min_count=2, max_count=5)
    
    # Pack into POST parameters
    payload = [
        ('entry.1655989716', age),
        ('entry.1566682594', occupation),
        ('entry.1703522628', city),
        ('entry.351519547', experience),
        ('entry.569976876', plants),
        ('entry.2002620154', location),
        ('entry.361211058', frequency),
        ('entry.616376992', confidence_needs)
    ]
    
    for diff in difficulties:
        payload.append(('entry.788508402', diff))
        
    for src in learning_sources:
        payload.append(('entry.9758556', src))
        
    payload.extend([
        ('entry.497594191', became_unhealthy),
        ('entry.584916445', lost_plant),
        ('entry.562715616', lost_reason),
        ('entry.119256494', ease_tell),
        ('entry.1522875097', conf_cause),
        ('entry.1278675539', not_known_cause),
        ('entry.1596404822', mistaken_problem),
        ('entry.1126704407', damage_significant),
        ('entry.1366652861', first_notice)
    ])
    
    for info in info_difficult:
        payload.append(('entry.966367741', info))
        
    for feat in confident_features:
        payload.append(('entry.519454187', feat))
        
    summary = {
        'age': age,
        'occupation': occupation.split('/')[0].strip(),
        'city': city,
        'exp': experience.split('/')[0].strip(),
        'plants': plants,
        'lost_plant': lost_plant.split('/')[0].strip(),
        'lost_reason': lost_reason.split('/')[0].strip()
    }
    
    return payload, summary

def submit_response(payload, user_agent=None):
    """Submits the encoded payload via HTTP POST to the Google Form endpoint."""
    if not user_agent:
        user_agent = random.choice(USER_AGENTS)
        
    encoded_data = urllib.parse.urlencode(payload).encode('utf-8')
    headers = {
        'User-Agent': user_agent,
        'Referer': 'https://docs.google.com/forms/d/e/1FAIpQLSeAIdhUJhjQzx91ujH_mCuNmF_lorzCsmRbekvo_uzmjWeNFA/viewform',
        'Origin': 'https://docs.google.com'
    }
    
    req = urllib.request.Request(FORM_URL, data=encoded_data, headers=headers)
    with urllib.request.urlopen(req, timeout=30) as resp:
        return resp.status == 200

PROGRESS_FILE = "form_progress.json"

def load_progress():
    if os.path.exists(PROGRESS_FILE):
        try:
            with open(PROGRESS_FILE, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception:
            pass
    return {"submitted": 0, "history": []}

def save_progress(progress):
    with open(PROGRESS_FILE, "w", encoding="utf-8") as f:
        json.dump(progress, f, indent=2, ensure_ascii=False)

def run_batch(count=5, min_delay=12, max_delay=35):
    """Submits a single batch of responses with jitter."""
    progress = load_progress()
    start_count = progress.get("submitted", 0)
    print(f"\n[🚀 BATCH START] Submitting {count} responses (Current total submitted: {start_count})...")
    
    success_count = 0
    for i in range(1, count + 1):
        payload, summary = generate_response_payload()
        try:
            now_str = datetime.now(IST).strftime('%H:%M:%S IST')
            ua = random.choice(USER_AGENTS)
            ok = submit_response(payload, ua)
            if ok:
                success_count += 1
                progress["submitted"] += 1
                progress["history"].append({
                    "timestamp": datetime.now(IST).isoformat(),
                    "city": summary["city"],
                    "age": summary["age"],
                    "exp": summary["exp"],
                    "lost": summary["lost_plant"]
                })
                save_progress(progress)
                print(f"  [{i}/{count}] [{now_str}] ✅ #{progress['submitted']}: {summary['city']} | Age: {summary['age']} | Exp: {summary['exp']} | Lost: {summary['lost_plant']}")
            else:
                print(f"  [{i}/{count}] [{now_str}] ⚠️ Non-200 status received")
        except Exception as e:
            print(f"  [{i}/{count}] ❌ Error: {e}")
            
        if i < count:
            delay = random.uniform(min_delay, max_delay)
            time.sleep(delay)
            
    print(f"[✅ BATCH DONE] Successfully submitted {success_count}/{count}. Total so far: {progress['submitted']}\n")
    return success_count

def run_distributed_until_midnight(target_total=100):
    """
    Runs continuously or intermittently, distributing responses between current time and midnight IST.
    """
    progress = load_progress()
    already_done = progress.get("submitted", 0)
    needed = max(0, target_total - already_done)
    
    if needed == 0:
        print(f"Target of {target_total} responses already reached! Nothing to do.")
        return
        
    print(f"\n[🕒 DISTRIBUTED RUNNER]")
    print(f"Target Total: {target_total} | Already Submitted: {already_done} | Remaining: {needed}")
    
    # Calculate time until midnight IST
    now = datetime.now(IST)
    midnight = now.replace(hour=23, minute=59, second=59, microsecond=0)
    
    seconds_remaining = (midnight - now).total_seconds()
    if seconds_remaining <= 0:
        print("Midnight IST has already passed! Submitting in compact batch...")
        run_batch(count=needed, min_delay=8, max_delay=20)
        return
        
    print(f"Time remaining until midnight IST: {seconds_remaining/3600:.2f} hours ({seconds_remaining/60:.1f} minutes)")
    
    # Target interval per response with random variation
    avg_interval = seconds_remaining / needed
    print(f"Average interval per submission: ~{avg_interval:.1f} seconds (~{avg_interval/60:.1f} minutes)\n")
    
    while progress["submitted"] < target_total:
        payload, summary = generate_response_payload()
        try:
            now_str = datetime.now(IST).strftime('%H:%M:%S IST')
            ua = random.choice(USER_AGENTS)
            ok = submit_response(payload, ua)
            if ok:
                progress["submitted"] += 1
                progress["history"].append({
                    "timestamp": datetime.now(IST).isoformat(),
                    "city": summary["city"],
                    "age": summary["age"],
                    "exp": summary["exp"],
                    "lost": summary["lost_plant"]
                })
                save_progress(progress)
                print(f"[{now_str}] ✅ #{progress['submitted']}/{target_total}: {summary['city']} | Age: {summary['age']} | Exp: {summary['exp']} | Lost: {summary['lost_plant']}")
        except Exception as e:
            print(f"❌ Submission Error: {e}")
            
        remaining_count = target_total - progress["submitted"]
        if remaining_count <= 0:
            break
            
        # Recompute remaining time dynamically
        cur_now = datetime.now(IST)
        rem_sec = (midnight - cur_now).total_seconds()
        if rem_sec <= 0:
            sleep_time = random.uniform(5, 15)
        else:
            base = rem_sec / remaining_count
            sleep_time = random.uniform(base * 0.7, base * 1.3)
            
        print(f"  💤 Sleeping {sleep_time:.1f}s until next submission ({remaining_count} left)...")
        time.sleep(sleep_time)
        
    print(f"\n🎉 Goal of {target_total} responses reached successfully at {datetime.now(IST).strftime('%H:%M:%S IST')}!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Google Form Survey Response Generator")
    parser.add_argument("--mode", choices=["batch", "continuous"], default="batch",
                        help="Run mode: 'batch' submits N responses now, 'continuous' runs until midnight IST")
    parser.add_argument("--count", type=int, default=5, help="Number of responses for batch mode (default: 5)")
    parser.add_argument("--target", type=int, default=100, help="Target total responses for continuous mode (default: 100)")
    parser.add_argument("--min-delay", type=float, default=12, help="Min delay between batch submissions in sec")
    parser.add_argument("--max-delay", type=float, default=35, help="Max delay between batch submissions in sec")
    
    args = parser.parse_args()
    
    if args.mode == "batch":
        run_batch(count=args.count, min_delay=args.min_delay, max_delay=args.max_delay)
    elif args.mode == "continuous":
        run_distributed_until_midnight(target_total=args.target)
