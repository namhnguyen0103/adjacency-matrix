# Foreign Aid Flows: Donor-to-Recipient Adjacency Matrix

An interactive D3.js adjacency matrix of foreign aid flows from donor countries to recipient countries and regions, 1991–2010.

## About the visualization

This adjacency matrix shows how foreign aid flowed from 25 donor countries to 129 recipients between 1991 and 2010. Each column is a donor and each row is a recipient. Each cell is colored by the total amount the donor gave that recipient, using a log scale where darker blue means more aid. Gray cells mark pairs with no recorded aid, and most of the matrix is gray. Recipients are grouped into countries, regions, and unspecified aid. Both axes are sorted by total amount, so the largest flows sit in the top-left corner. There, Germany and the United States stand out as the largest donors, and Indonesia as the top recipient country. You can filter by year range and aid purpose, and hovering over a cell shows the exact total and the number of projects.

### Marks and visual encodings

- **Mark:** each square cell is an area mark for one donor–recipient pair.
- **Position:** the row is the recipient and the column is the donor. Both axes are sorted by total amount, or A–Z.
- **Color:** a single blue that goes from light to dark on a log scale and shows the total aid given. The log scale keeps small amounts visible next to the very large ones.
- **Light gray cells:** no recorded aid for that pair.
- **Spatial grouping:** recipient rows are split into Countries, Regions and Unspecified.
- **Hover highlight:** an outline marks the row, the column and the cell, and a tooltip shows the exact total and the number of projects.

### Interaction

- **Years:** limit the data to a range of years.
- **Purpose:** show only one of the 135 aid purposes.
- **Sort:** order the donors and recipients by total amount or alphabetically.
- **Hover:** point at a cell, a donor name or a recipient name to see the details.

## Project structure

```
.
├── index.html   # Page layout and controls
├── main.js      # Data loading, aggregation and D3 rendering
├── style.css    # Styles (light and dark mode)
└── aid.csv      # Aid data: one row per project
```

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

## Data

`aid.csv` has these columns: `ID`, `Year`, `Donor name`, `Recipient name`, `Amount`, `Purpose-code`, `Purpose`.

- The matrix sums `Amount` for each donor–recipient pair across the selected years and purposes.
- Rows with a blank amount or a blank donor are skipped. That's 2 of the 501 rows.
- Amounts are shown in the units the CSV uses.
- Recipients are grouped like this:
  - **Regions:** names ending in ", regional", plus "Sts Ex-Yugo. Unspec."
  - **Unspecified:** "Bilateral, unspecified", meaning aid not assigned to any single recipient
  - **Countries:** everything else

## Built with

- [D3.js v7](https://d3js.org/)
- HTML, CSS and JavaScript (no build step)
