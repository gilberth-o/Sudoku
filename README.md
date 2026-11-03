# Shinobi Sudoku

A Naruto-inspired, responsive Sudoku site built with plain HTML, CSS, and
JavaScript. The landing page is `index.html`, the playable Sudoku games live
on their own page at `puzzle.html`, local stats are shown at `progress.html`,
and appearance/accessibility preferences are on `settings.html`.

Play as often as you like: choose Easy, Medium, or Hard, then use **Next game**
to get another uniquely solvable puzzle at the selected difficulty. Choose a
square and enter numbers with the number pad or keyboard. Use **Check puzzle**
to see your progress, or **Reset puzzle** to start again. Completed puzzles
update your solved count, best time, and consecutive-day streak. Progress is
stored in this browser on this device. Settings include light, dark, and
shinobi themes, larger numbers, voice assistance, focus highlighting, and a
relax mode.

## Run locally

Open `index.html` in a browser and select **Play Sudoku** to play, or use
**Progress** and **Settings** to view your stats and customize the game. No
build step or dependencies are required.

## Deploy to Vercel

Import this repository into Vercel and deploy it as a static site. The project
uses `index.html` at the repository root, so no build command or output
directory is needed.
