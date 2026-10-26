# Intent: Ask J. Law, a bot that answers questions about me
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem
Visitors who want to know whether I'm the right person for something have to read the home page, the blog and the achievements and piece it together. Most won't. I also want a working example of an AI feature built with proper guardrails on my own site, because how it is kept safe and cheap says more about how I build than the chat itself.

## Proposed outcome
A visitor can ask a question in their own words and get a short, plain answer about me and my work, with a pointer to where on the site it comes from. The bot only knows what the site already publishes. When it doesn't know, it says so and points the visitor to me, instead of guessing. A wrong claim about me on my own site is worse than having no bot.

It only talks about me and my work. It is not a free general-purpose chat, and asking it for unrelated help gets a short redirect.

Its cost stays small and capped, and it can't be run up by strangers. When the cap is reached it stops cleanly and tells the visitor, rather than showing an error.

It is me, as a character. A character on the hero island stands with a speech bubble that says "Hi, I'm J. Law. What would you like to know?". Clicking the bubble moves the bubble and the character to the bottom left of the screen, where the conversation happens. There is no separate floating button. A hero input with an avatar and a floating item in the bottom-right corner were also considered, and I want to compare them before choosing.

## Affected users and systems
Visitors to the site, on desktop and on phones. The home page and its hero. Whatever the bot reads to answer: the site's public pages and content. The AI service credits that pay for it.

## Constraints
- The bot answers only from the site's public content, and never from private material.
- Nothing sensitive is stored or shown: no secrets in the repository, nothing about other people, clients or employers.
- Visitors must not be able to spend the credits freely. Cost has a hard ceiling per visitor and for the whole site.
- It follows the design system: voice, square flat look, 44px tap targets, visible focus ring and reduced-motion support.
- It is clearly labelled as an AI assistant, and says that answers can be wrong.
- The rest of the site keeps working whether or not the bot is available.
- Out of scope: a general chatbot, remembering visitors, and accounts or sign-in.

## Open questions
- Character on the island, hero input, or floating item? To be decided after seeing the design canvas.
- If the character speaks as me, is the AI label enough to make clear it is not me typing?
- Should visitors be able to type their own question, or only pick from suggested ones?- Should the spec propose what the bot should do for questions about availability or pricing, which the site doesn't answer?
