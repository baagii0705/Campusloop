# Сургууль, хөтөлбөрийн лавлах

The files are snapshots of the Sol1o state-university research workbook. The links and source periods travel with the records. Program rows from different sources or years are retained independently. The national index in column 7 is a reference match by normalized name. An empty school code stays empty.

`schools.json` holds the institution roster, branches and source notes. Each other file is a gzipped UTF-8 JSON array of rows used by `../directory.js`. To inspect one, use `gzip -dc programs.json.gz`. Keep identifiers and codes as text to preserve leading zeroes.

The Mongolian National University (МУИС) 2023 records were adapted from the [МУИС open data portal](https://data.num.edu.mn/) and are shared under [CC BY-SA 2.0](https://creativecommons.org/licenses/by-sa/2.0/). Changes include extraction into JSON, normalization and the added reference-index matches. The attribution applies to the adapted 2023 program, course, curriculum and relation data.
