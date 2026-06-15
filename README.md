# Alphabet Words

A daily phonics app for an early reader. Two words appear automatically each
day, moving A -> Z (two days per letter), pulled from a 500+ word bank.

## Files
- index.html      The kid's app (shows today's words automatically; no buttons).
- words.js        The word bank (500+ words by letter and syllable count).
- schedule.json   Sets the start date. Edit "startDate" to reset.
- sounds.html     Dyslexia-friendly Letter Sounds page (linked from the app).
- preview.html    Parent-only: shows TOMORROW's words so you can hide magnets.

## Deploy (GitHub Pages)
1. Upload all five files to the repo root (keep them together).
2. Repo Settings > Pages > Deploy from a branch > main > / (root) > Save.
3. App URL:     https://<user>.github.io/alphabet/
   Sounds:      https://<user>.github.io/alphabet/sounds.html
   Preview:     https://<user>.github.io/alphabet/preview.html  (don't share with the kid)

## Reset to letter A
Open schedule.json and set "startDate" to today's date, e.g. "2026-06-14".

## Add words
Edit words.js, e.g.:
  BANK['A']['2'].push({text:'acorn', syllables:['a','corn']});
To fix a sound, give a syllable a spoken spelling: {show:'ap', say:'app'}.
