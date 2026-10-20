# Intent: Explainer asset library
Author: J. Law. Cordova (site owner). Status: accepted.

## Problem
I want to share what I learn: from Claude courses, cloud architecture, and new
AI technologies and concepts. Videos and infographics explain these best with
pictures and analogies (a kitchen for the peer review process, an office, a
server room), but I have no library of art to build them from, and drawing
each piece for each video doesn't scale.

## Proposed outcome
A large library of isometric pixel-art assets, about 40 of them, that I can
reuse later in videos and infographics:

- a kitchen for analogies: a chef, a waiter, kitchen floor blocks, a stove, a
  sink, tables, chairs, and the pieces of a restaurant's order flow;
- an office: server machines, computers, desks and L-desks, three potted
  plants, cubicle walls, office floor blocks, a water dispenser, wires that
  connect computers, office staff, a laptop, five cats, the charts managers
  show, and a giant light bulb;
- the concepts I explain: cloud architecture pieces, AI pieces (agents, tokens,
  tools, memory and the like), and the pieces that tie a scene together, such
  as arrows, speech bubbles and labels.

Assets that suit motion are animated with short loops, decided per asset, so
they work in videos, and every one still works as a still image.

## Affected users and systems
Me, when I make videos and infographics; the people who watch them. The
library is its own Pixel Lab document, separate from the site's art.

## Constraints
- Isometric, matching the site's pixel art: its size and palette. Some items
  may be oversized.
- A separate .pixellab document. It's fine for it to be public.
- Generic and public-safe, like everything in this repository.
- The first two assets (the chef and the waiter) are prototyped and approved
  first; the rest follow one subagent at a time, each handling one to four
  assets depending on complexity, until all of them are made, then one PR.
- Out of scope: changing the site's own art or pages.

## Open questions
None. The spec proposes the full list and the animations.
