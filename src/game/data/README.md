# Mariana regional bathymetry

GEBCO Compilation Group (2020), GEBCO 2020 Grid, DOI **10.5285/a29c5465-b138-234d-e053-6c86abc040b9**. Extracted through Open Topo Data on 11 October 2026.

- Source and terms: https://www.gebco.net/data-products/gridded-bathymetry-data/gebco-2020
- API documentation: https://www.opentopodata.org/datasets/gebco2020/
- Bounds: 11.10–11.60°N, 141.95–142.65°E.
- 61 rows north to south; 81 columns west to east; positive-up elevations in metres.
- Source grid: 15 arcseconds. Extracted sampling: 30 arcseconds latitude, 31.5 arcseconds longitude; API bilinear interpolation.
- Range in this extraction: −10,925 to −5,971 m. “Deepest grid point” means this extraction's minimum, not a definitive survey claim for Challenger Deep.

GEBCO's public-domain data terms require acknowledgment and responsible representation; neither GEBCO nor its contributors endorse this application. This file is a gridded compilation, not a navigation product. The regional grid does not resolve rocks, overhangs or metre-scale cliff geometry. No vertical exaggeration is applied; local distance uses a central-latitude equirectangular approximation.

Reproduce from the repository root with `python3 scripts/fetch-bathymetry.py`. Cached batches live under ignored `output/research/gebco-batches`. Rendering/collision use the same triangular interpolation, separately from the upstream API's bilinear resampling. Other ocean destinations are authored scenes.
