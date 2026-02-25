# Flair Corporate Website

[![Deploy to Firebase Hosting (OIDC)](https://github.com/flair-agency/corporate-site/actions/workflows/firebase-hosting-deploy.yml/badge.svg)](https://github.com/flair-agency/corporate-site/actions/workflows/firebase-hosting-deploy.yml)

This repository contains the source code for the official corporate website of **Flair**, a Japan-based TikTok LIVE agency.

- 🌐 Website: https://www.flair-agency.biz/

## About Flair

Flair is a TikTok LIVE agency dedicated to empowering creators to express themselves through live streaming.  
We support emerging and beginner creators by providing:

- Creator scouting and onboarding  
- Streaming strategy and operational support  
- Equipment assistance  
- Performance analysis and growth optimization  

## Repository Purpose

This repository manages:

- Corporate website source code  
- Static assets and public-facing pages  
- Styling and UI components  
- Deployment configuration  

It does **not** contain internal operational systems or creator management tools.

## Tech Stack

- HTML  
- CSS  
- JavaScript  
- Tailwind CSS  
- Firebase Hosting  

---

## Development

Install dependencies:

```
npm install
```

Run Tailwind build (watch mode):

```
build:css:watch
```

Build for production:

```
npm run build
```

## Deployment

The website is deployed via **Firebase Hosting**.  
Deployment configuration is managed in:

- `firebase.json`
- `.firebaserc`

To deploy:

```
firebase deploy
```

---

## License

This project is licensed under the ISC License.  
See the `LICENSE` file for details.

## Maintainer

[Flair LLC](https://www.flair-agency.biz/company)
