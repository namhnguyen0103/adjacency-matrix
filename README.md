# Foreign Aid Flows: Donor-to-Recipient Adjacency Matrix

An interactive D3.js adjacency matrix of foreign aid flows from donor countries to recipient countries and regions, 1991–2010.

## About the visualization

This adjacency matrix shows how foreign aid flowed from 25 donor countries to 129 recipients between 1991 and 2010. Each column is a donor and each row is a recipient. Each cell is colored by the total amount the donor gave that recipient, using a log scale where darker blue means more aid. Gray cells mark pairs with no recorded aid, and most of the matrix is gray. Recipients are grouped into countries, regions, and unspecified aid. Both axes are sorted by total amount, so the largest flows sit in the top-left corner. There, Germany and the United States stand out as the largest donors, and Indonesia as the top recipient country. You can filter by year range and aid purpose, and hovering over a cell shows the exact total and the number of projects.

## Setup and running

You only need a web browser and a way to serve static files. D3 v7 loads from a CDN, so there's nothing to install.

1. Clone the repository:

   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   ```

2. Start a local web server in the project folder. Python 3 is the easiest way:

   ```bash
   python3 -m http.server 8000
   ```

3. Open http://localhost:8000 in your browser.

> **Note:** Opening `index.html` directly (by double-clicking it) won't work, because browsers block `d3.csv` from loading a local file over `file://`. Always open the page through a local server.

Any other static server works too, for example `npx serve` or the VS Code Live Server extension.

## Built with

- [D3.js v7](https://d3js.org/)
- HTML, CSS and JavaScript (no build step)
