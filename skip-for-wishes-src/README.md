# Skip for Wishes

Skip for Wishes is a React, TypeScript, and Tailwind CSS fundraiser page built as a static route for DexterBain.com.

## Updating Fundraising Values

Edit `public/config.js`, then rebuild the site. The same file is copied to `../skip-for-wishes/config.js`, so the live static route can also be updated manually.

```js
window.skipForWishesConfig = {
  fundraiserUrl: "https://official-make-a-wish-fundraiser-link.example",
  raised: 0,
  goal: 100000,
  donors: 0,
  lastUpdated: "August 3, 2026"
};
```

All Donate Now buttons use `fundraiserUrl`. Keep donations on the official Make-A-Wish fundraising page.

