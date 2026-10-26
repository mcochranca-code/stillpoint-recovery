/** Coverage and provenance notes from the user-provided workbook and Census batch snapshot. */
export const workbookMeetingCoverage = {
  "snapshotDate": "2026-10-26",
  "workbookName": "Recovery_Meetings_California_Counties_2026-10-26.xlsx",
  "allMeetingsSheet": "All Meetings",
  "rowsImported": 233,
  "completenessNote": "This is a substantial official-source-based verified extract, but it is not an exhaustive enumeration of every meeting in all seven counties. Live AA and NA directories contain many additional rows; some are dynamic, paginated, image/PDF-based, or have conflicting or unreadable schedule details. A source listing does not independently prove a meeting remains active. Follow each official source link to confirm current day/time, venue, access, and status before attending.",
  "timezoneNote": "The workbook records most local times as Pacific. Preserve any source timezone ambiguity in the per-listing note and verify it at the official source. Times are displayed as listed; the app does not convert schedule times.",
  "credentialNote": "Meeting passwords and private passcodes are not reproduced; use the official source link for joining instructions.",
  "countyCoverage": [
    {
      "county": "Alameda County",
      "rowsIncluded": 50,
      "uniqueAddressQueries": 25,
      "exactAddressMatches": 21,
      "distinctExactLocations": 20,
      "limitation": ""
    },
    {
      "county": "Fresno County",
      "rowsIncluded": 18,
      "uniqueAddressQueries": 2,
      "exactAddressMatches": 1,
      "distinctExactLocations": 1,
      "limitation": ""
    },
    {
      "county": "Los Angeles County",
      "rowsIncluded": 50,
      "uniqueAddressQueries": 26,
      "exactAddressMatches": 19,
      "distinctExactLocations": 18,
      "limitation": ""
    },
    {
      "county": "Mariposa County",
      "rowsIncluded": 24,
      "uniqueAddressQueries": 5,
      "exactAddressMatches": 1,
      "distinctExactLocations": 1,
      "limitation": ""
    },
    {
      "county": "Merced County",
      "rowsIncluded": 78,
      "uniqueAddressQueries": 23,
      "exactAddressMatches": 11,
      "distinctExactLocations": 10,
      "limitation": ""
    },
    {
      "county": "Stanislaus County",
      "rowsIncluded": 3,
      "uniqueAddressQueries": 0,
      "exactAddressMatches": 0,
      "distinctExactLocations": 0,
      "limitation": ""
    },
    {
      "county": "Tulare County",
      "rowsIncluded": 10,
      "uniqueAddressQueries": 4,
      "exactAddressMatches": 2,
      "distinctExactLocations": 2,
      "limitation": ""
    }
  ],
  "geocoding": {
    "provider": "U.S. Census Geocoder",
    "documentationUrl": "https://geocoding.geo.census.gov/geocoder/Geocoding_Services_API.html",
    "benchmark": "Public_AR_Current",
    "benchmarkId": 4,
    "checkedAt": "2026-10-26",
    "physicalOrHybridRows": 166,
    "uniqueAddressQueries": 85,
    "matchExact": 55,
    "matchNonExact": 27,
    "noMatch": 3,
    "distinctExactLocations": 52,
    "methodNote": "Only official Census batch results with Match + Exact are mapped. Census coordinates are interpolated address-range positions, not surveyed venue entrances. The app never geocodes at runtime or requests device location."
  }
} as const;
