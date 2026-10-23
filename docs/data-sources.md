# SCM ReVamp: data inventory

Taken from Rohan's local folder `C:\Users\panni\Desktop\SCM-BitNBuild 26`, read on 2026-10-23.

## Real data found (will be loaded into Supabase as seed data)

| Source file | What it gives us | Used for |
| --- | --- | --- |
| KSPCB Annual Report 2023-24 (`Annual Report_2025_FINAL english.pdf`) | 2022-23 hazardous waste generation in Karnataka: landfillable 97,114 t, incinerable 33,129 t, recyclable 122,232 t, utilizable 290,083 t (542,558 t in total). 3,972 HW generating units. Industry counts: 5,616 Red, 13,457 Orange, 27,163 Green and 4,184 White | Scale of the opportunity, KPI baselines |
| Same report, TSDF section | Dabaspet TSDF (Re Sustainability, 8 lakh MT design capacity). Harohalli TSDF has been **full since 3 Feb 2021**. Kadechur (Yadgir) TSDF has 2,57,297 MT capacity | Regulator agent: stop routing hazardous waste to Harohalli |
| Same report, Table 28 | 9 common incinerators with names, locations and capacity in MT/a, including Haat (Anekal), Gomti (Kumbalagodu), Century Refineries (Hoskote) and E Nano (Harohalli) | Real disposal and recovery destinations |
| Same report, Table 29 | 9 cement plants authorised for co-processing (Kalaburagi, Bagalkot, Belagavi) | Destinations for incinerable waste and AFR |
| Same report, Table 23 | Fly ash generation and utilisation per thermal plant (e.g. NTPC Kudgi 53.9 lakh t at 80.2%, RTPS Raichur 30.6 lakh t at 73.3%) | Real fly ash sellers and their unused surplus |
| Same report | 257 authorised HW recyclers. 16 CETPs, of which 11 operate | Buyer and recycler universe |
| CSTEP Emission Inventory, Bengaluru (Table 3.3) | On-road emission factors in g/km, e.g. HCV: CO 6, NOx 9.3, PM 0.42 (5-year-old vehicle), with 10- and 15-year rows | Truck PM and NOx per route (replaces flat assumptions) |
| CSTEP EI and source apportionment | Bengaluru PM10 shares: transport 42%, road dust 20%, construction 14%, industry 14% | Context for the dust mitigation KPI |
| CPCB C&D Waste Guidelines 2017 | IS 383:2016 allows recycled concrete aggregate at up to 25% in plain concrete, 20% in RCC up to M25 and 100% in lean concrete below M15. Recycled products must be priced at least 20% below virgin | Compatibility rules and buyer price ceiling for C&D material |
| `symbiosis-prototype` (Python) | 20 seeded facilities with coordinates, floors and volumes, plus a Python version of the agents | Starting seed data and code reference for the Python port |
| `presentation.md`, README variants | Pitch narrative | Docs |

## Gaps to fill from the internet during the build
- Coordinates of KIADB industrial areas (Peenya, Bidadi, Dobaspet, Harohalli, Bommasandra, Jigani, Tumakuru Vasanthanarasapura), from OpenStreetMap.
- Diesel truck CO2 per tonne-km in India, and road freight rates in INR per tonne-km.
- Market prices for fly ash, GGBS/slag, recycled aggregate and used oil.

The `cetps.pdf` file is a scanned image with no text layer. The screen recordings were not used.
