---
name: project-pfe-webapp
description: The PFE web app for OCP Benguerir KOCH installation — interactive schema of conveyors/drums/components with datasheets
metadata:
  type: project
---

PFE (final-year project) web app for the OCP Benguerir laverie "installation KOCH". Goal: let operators quickly locate identical mechanical components (arbres/shafts, viroles, tambours) that recur across different conveyors, so they don't waste time hunting the chain.

**Why:** the same component plan (e.g. arbre plan `1.111.084 128`) is reused across many drums on different conveyors; operators need a fast cross-reference + access to datasheets.

**How to apply:** core feature is an interactive master schema (landing page) + per-conveyor schematic + per-drum datasheets. Admins fill data by uploading an Excel like `Tambour et virole 4.6.xlsx`.

## Source files (in ../PFE/, OneDrive — may be file-locked; copy to temp before opening with python)
- `SCHEMA INSTALLATION   BG 19.02.10-Model.pdf` — master "SCHEMA DES INSTALLATIONS FIXES BEN GUERIR". 1 page, 3370x2384pt. Labels: conveyors B0–B12, T1–T17, RP (roue-pelle), Stacker, plus characteristics tables.
- `Tambour et virole 4.6.xlsx` — sheet `Feuil1`, "ETAT DES TAMBOURS -KOCH-". One row per drum.

## Excel data model (column groups, header row 3-4)
- **Inst** (A): conveyor name, groups rows. Values seen: "chario verseur stacker-T14a-T14b", "Roue-pelle Koch", "T15", "T17".
- **INFORMATIONS** (B-E): B=schémas (embedded image of the conveyor, anchored in col B per Inst group), C=N° (drum number within conveyor), D=Ø diameter, E=L length.
- **LIAISONS** (G-I): dynano bloc, Anano bloc, ETAT.
- **ARBRE** (K-O): Type Arbre, Plan Arbre KOCH, Plan arbre OCP, REPERE, ETAT.
- **Virole** (Q-U): type virole, Plan Virole KOCH, Plan Virole OCP, REPERE, ETAT.
- **Tambour** (V): value 0 (state).

## Key insight: conveyor images
Each Inst group has ONE embedded image = side-view schematic of the belt with **numbered circles = drums** (1,2,3,4...) matching the N° column. Drive drum often shown as filled black/white circle. These circles become the clickable hotspots; a drum N° in the image == a row in the Excel.

Targets for the master schema (admin selectable): B0–B7, T1–T17, RP.
