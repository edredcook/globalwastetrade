# Global Waste Trade

Source for [globalwastetrade.org](https://globalwastetrade.org): an explorer for the international trade in plastic waste, built on UN Comtrade data.

## What's here

| Path | What it is |
|---|---|
| `site/` | The website. One static page, served as is. No build step. |
| `site/data/` | The data the page loads: `manifest.json` lists the years, `plastic_<year>.json` holds each year's trade records, `trends.json` the yearly totals for the trend charts. |
| `site/vendor/` | d3 7.8.5, d3-sankey 0.12.3 and topojson-client 3.1.0, kept locally. |
| `pipeline/fetch_comtrade.py` | Downloads one year of HS 3915 records from the Comtrade API. |
| `pipeline/build_site_data.py` | Applies the data rules, writes `site/data/` and a check report in `pipeline/reports/`. |
| `pipeline/build_trends.py` | Summarises every year into `site/data/trends.json`. |
| `pipeline/income_history.py` | Turns the World Bank's historical income classification (OGHIST.xlsx) into `pipeline/reference/income_history.json`. |
| `pipeline/reference/` | Country names, income groups (the World Bank group for each year), region schemes and the BACI figures for plastic traded amongst other materials. |
| `render.yaml` | Render Blueprint for hosting. |

## Data rules

- Exporter-reported and importer-reported figures are kept apart and never added together. The page can also show a resolved figure, which is one number per route.
- Each year uses the World Bank income group based on that year's GNI. Economies the World Bank left unclassified that year show as not classified.
- One record per reporter, flow and partner. Use the partner-2 World total where the reporter gives one, otherwise sum the partner-2 detail.
- Customs procedure and transport mode totals only (C00, mode 0).
- Trade with World, and a country's trade with itself, are left out.
- Cleaning, with every change listed in the check report:
  - A record with a value but no weight takes the partner's weight. If there is no usable partner report, the weight is the value divided by the median US$ per tonne.
  - A record whose US$ per tonne is more than 10 times above or below the median takes the partner's weight, if the partner's report is in range. Otherwise it is left as reported and listed.
  - Re-estimated weights are marked as such on the page and in downloads.
- The build stops without changing the site if either view's tonnes fall below 60% of the previous file, or if a view has fewer than 300 routes.

## Refreshing the data

The **Refresh Comtrade data** workflow runs at 06:00 UTC on the 1st of each month and refreshes the last three years, since countries keep revising recent data. It can also be started by hand from the Actions tab for any years. It needs a `COMTRADE_API_KEY` repository secret. The free Comtrade tier is enough.

When the data changes, the workflow opens a draft pull request whose description holds the check reports. Merging it publishes the new data. For the workflow to open pull requests, turn on **Settings → Actions → General → Allow GitHub Actions to create and approve pull requests**.

To run it locally:

```sh
export COMTRADE_API_KEY=...        # never commit this
python pipeline/fetch_comtrade.py --year 2023
python pipeline/build_site_data.py --year 2023
python pipeline/build_trends.py
python -m unittest discover -s pipeline/tests
python -m http.server -d site 8000  # then open http://localhost:8000
```

## Hosting

Render serves `site/` as a static site (see `render.yaml`). Every merge to `main` redeploys it.
