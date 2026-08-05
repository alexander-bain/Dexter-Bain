# Make a Wish

Make a Wish is a React, TypeScript, and Tailwind CSS fundraiser page built as a static route for DexterBain.com.

## Fundraising Progress

The `sync-skip-for-wishes.yml` workflow checks the official Make-A-Wish campaign every 15 minutes. It updates the public raised amount and goal only when Make-A-Wish reports a change.

Run the sync manually from the repository root with `node scripts/sync-skip-for-wishes.mjs`. The donor count remains editable because the public campaign API does not expose private gift records.

```js
window.skipForWishesConfig = {
  "fundraiserUrl": "https://secure2.wish.org/site/TR/WishYourWay/Make-A-WishAmerica?pg=personal&px=11514783&fr_id=7471",
  "raised": 0,
  "goal": 10000,
  "donors": 0,
  "lastUpdated": "August 4, 2026"
};
```

All Donate Now buttons use `fundraiserUrl`. Keep donations on the official Make-A-Wish fundraising page.
