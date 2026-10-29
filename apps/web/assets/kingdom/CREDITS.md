# Kingdom assets

`scripts/build-kingdom.mjs` assembles `public/kingdom.glb` from these. Only the pieces it uses are kept here.

| Asset | Author | Licence |
|---|---|---|
| `kaykit/` — [KayKit Medieval Hexagon Pack 1.0](https://kaylousberg.itch.io/kaykit-medieval-hexagon) | [Kay Lousberg](https://www.kaylousberg.com) | CC0 1.0 (`kaykit/License.txt`) |

The pack's shared palette (`kaykit/hexagons_medieval.png`) is retinted by `scripts/retint-kaykit.py`: every colour is
more vibrant, the grass swatch is a lush green over a band of earth (so cell edges read as a grass lip over soil), and
the tree greens shift from teal to a fresh green that sits with the lawn.

The lawn, the rock under the island, the dirt paths, the pond, the grass and flowers, the Dim (fog), the raid storm,
the treasure orb and the vault coins are made in code (`src/bulbu/kingdom.js`).
