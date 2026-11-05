# Google Form Response Automation

Automated submission engine for the gardening survey Google Form (`1FAIpQLSeAIdhUJhjQzx91ujH_mCuNmF_lorzCsmRbekvo_uzmjWeNFA`).

## Features
- **Accurate Demographics:**
  - Age: 20–50 years (18–24: 20%, 25–34: 50%, 35–44: 20%, 45–54: 10%)
  - Occupation: Employed (85%), Self-employed (15%)
  - Cities: **20–30% Dehradun** (with natural casing/spelling variations) + **70–80% uncommon Tier-2/Tier-3 cities across India** (Rishikesh, Haldwani, Solan, Saharanpur, Bareilly, Udaipur, Jabalpur, Cuttack, Siliguri, Belagavi, Thrissur, Tirupati, etc.)
  - Gardening Experience: < 3 years (1–2 yrs: 40%, 6mo–1yr: 35%, <6mo: 25%)
  - Plant Count: Proportionate (mostly 6–10 plants, some 1–5, few 11–20)
  - Plant Loss: **88% answered YES** to losing a plant with realistic causes (overwatering, extreme weather, pest infestation, disease)
  - Natural variance across checkbox selections, difficulty pain points, and learning channels
  - User-Agent rotation (30+ Windows, macOS, Android, iPhone device headers)
  - Random human-like submission delays (12–45 seconds)

---

## How to Run Locally

### 1. Run a Quick Batch
Submit an immediate batch of responses with randomized jitter:
```bash
# Submits 5 responses (default)
python google_form_automation/fill_survey.py --mode batch --count 5

# Submits 15 responses with 15-40 second delays between them
python google_form_automation/fill_survey.py --mode batch --count 15 --min-delay 15 --max-delay 40
```

### 2. Run Distributed Mode (Till Midnight IST)
Runs in the background, calculating the exact time remaining until 12:00 AM IST and spacing out responses with natural variation to reach the target 100 responses smoothly:
```bash
python google_form_automation/fill_survey.py --mode continuous --target 100
```
Progress is tracked automatically in `form_progress.json`. If you stop and restart, it seamlessly continues from where it left off.

---

## How it Runs in GitHub Actions

The workflow file is located at [`.github/workflows/form_filler.yml`](file:///d:/SIH%2026/.github/workflows/form_filler.yml).

1. **Automatic Cron Schedule:**
   - Runs automatically every 25 minutes between 3:30 PM IST and 12:00 AM IST.
   - Each run calculates how much time is left before midnight and dynamically chooses a random batch size (e.g. 4 to 8 responses) with random delays.
   - Updates and commits `form_progress.json` automatically.

2. **Manual Dispatch (On Demand):**
   - Go to your repository on GitHub -> **Actions** tab -> **Google Form Automated Submissions**.
   - Click **Run workflow**.
   - You can specify a custom `batch_count` (e.g., `10`) or leave it as `auto`.
