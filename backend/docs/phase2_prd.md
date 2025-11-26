# Phase 2 Requirements

## Phase 2 roadmap
1. develop the auth endpoint and service 
-using auth js
-proper middleware with JWT
2. test auth service
3. save user auth to database
4. develop a credit system
- a node-cron scheduling service that gives credits to users that have signed up every 00:00
5. develop economics for the credit system


--add a working signup button in the landling page
-make a simple frictionless signup logic and save data to database

-update the profile in the backend with the actual credit received


do the auth where it saves the user data → then you can build the economy logic.

The schema for the user data will include the trimmed response when the user signs up—when the user signs in, there’s profile data in the response so we save that to our database.
And then once it’s saved in the database, the economy logic will append new fields to that DB entry.
You’re in charge of which fields to append, but the important parts are:
• consecutive days online
• updated on
• created at
• available credits
• expended credits

in the credit economy logic,
core things are:
daily credit allocation (scheduler)
stock market system (buy, sell, multipliers, leverage, and supply)
proper transaction signings
