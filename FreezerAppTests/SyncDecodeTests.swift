import XCTest
@testable import FreezerApp

/// Decoding tests for the sync payload. These prove the M0 hardening behaviour:
/// - categories/items are decoded via `LossyArray` (a single malformed row is
///   skipped, not fatal);
/// - history keeps events with an unknown `type` (`.unknown`) but skips
///   structurally malformed events;
/// - ISO-8601 timestamps with fractional seconds decode fine (G-004).
///
/// Everything decodes through a `JSONDecoder` configured identically to
/// `APIClient`'s private decoder (`dateDecodingStrategy = .iso8601`).
final class SyncDecodeTests: XCTestCase {

    /// The EXACT production decoder used by `APIClient` (accepts ISO-8601 with
    /// and without fractional seconds — the backend wire always sends fractional).
    private func makeDecoder() -> JSONDecoder {
        APIClient.makeJSONDecoder()
    }

    // MARK: - (a) Lossy items / categories

    func testItemsArraySkipsOneMalformedElementAndKeepsValidOnes() throws {
        // Two valid items + one malformed item (missing required `name`,
        // `expirationDate`, `categoryId`). The malformed one must be skipped.
        let json = """
        {
          "categories": [],
          "items": [
            {
              "id": "item-1",
              "name": "Куриный бульон",
              "packagesCount": 2,
              "itemsCount": 5,
              "shelfNumber": 3,
              "freezeDate": "2026-01-01T00:00:00Z",
              "expirationDate": "2026-06-01T00:00:00Z",
              "categoryId": "cat-1",
              "updatedAt": "2026-01-01T00:00:00Z"
            },
            {
              "id": "item-broken",
              "packagesCount": 1
            },
            {
              "id": "item-2",
              "name": "Говяжий бульон",
              "packagesCount": 1,
              "itemsCount": 3,
              "shelfNumber": 2,
              "freezeDate": "2026-01-02T00:00:00Z",
              "expirationDate": "2026-05-01T00:00:00Z",
              "categoryId": "cat-1",
              "updatedAt": "2026-01-02T00:00:00Z"
            }
          ],
          "history": []
        }
        """
        let data = Data(json.utf8)
        let syncData = try makeDecoder().decode(APIClient.SyncData.self, from: data)

        XCTAssertEqual(syncData.items.count, 2, "malformed item should be skipped, 2 valid kept")
        XCTAssertEqual(syncData.items.map(\.id), ["item-1", "item-2"])
        XCTAssertEqual(syncData.items.map(\.name), ["Куриный бульон", "Говяжий бульон"])
    }

    func testCategoriesArraySkipsOneMalformedElementAndKeepsValidOnes() throws {
        // Two valid categories + one malformed (missing required `name` and
        // `itemCount`). The malformed one must be skipped.
        let json = """
        {
          "categories": [
            {
              "id": "cat-1",
              "name": "Овощи",
              "icon": "🥬",
              "color": "#34C759",
              "itemCount": 12,
              "sortOrder": 0,
              "updatedAt": "2026-01-01T00:00:00Z"
            },
            {
              "id": "cat-broken",
              "icon": "🍖"
            },
            {
              "id": "cat-2",
              "name": "Мясо",
              "itemCount": 8,
              "updatedAt": "2026-01-01T00:00:00Z"
            }
          ],
          "items": [],
          "history": []
        }
        """
        let data = Data(json.utf8)
        let syncData = try makeDecoder().decode(APIClient.SyncData.self, from: data)

        XCTAssertEqual(syncData.categories.count, 2, "malformed category should be skipped, 2 valid kept")
        XCTAssertEqual(syncData.categories.map(\.id), ["cat-1", "cat-2"])
        XCTAssertEqual(syncData.categories.map(\.name), ["Овощи", "Мясо"])
    }

    // MARK: - (b) History: keep unknown type, skip malformed

    func testHistoryKeepsUnknownTypeButSkipsMalformedElement() throws {
        // 1 valid known-type event, 1 event with an UNKNOWN type (kept as
        // .unknown), and 1 structurally malformed event (missing required
        // `id`/`itemName`/`timestamp`) which must be skipped.
        let json = """
        [
          {
            "id": "evt-1",
            "type": "item_added",
            "itemName": "Куриный бульон",
            "timestamp": "2026-01-01T00:00:00Z",
            "updatedAt": "2026-01-01T00:00:00Z"
          },
          {
            "id": "evt-2",
            "type": "future_event",
            "itemName": "Что-то новое",
            "timestamp": "2026-01-02T00:00:00Z",
            "updatedAt": "2026-01-02T00:00:00Z"
          },
          {
            "type": "item_updated",
            "packagesDelta": 1
          }
        ]
        """
        let data = Data(json.utf8)
        let events = try makeDecoder().decode(LossyArray<HistoryEvent>.self, from: data).elements

        XCTAssertEqual(events.count, 2, "malformed event skipped, unknown-type event kept")
        XCTAssertEqual(events.map(\.id), ["evt-1", "evt-2"])
        XCTAssertEqual(events[0].type, .itemAdded)
        XCTAssertEqual(events[1].type, .unknown, "unknown type must decode to .unknown, not be dropped")
    }

    // MARK: - (c) ISO-8601 with fractional seconds (the wire's real format)

    func testISO8601TimestampWithFractionalSecondsDecodes() throws {
        // A bare ISO-8601 timestamp string with fractional seconds must decode
        // into the correct Date instant under the PRODUCTION decoder.
        let json = "\"2026-01-01T00:00:00.000Z\""
        let data = Data(json.utf8)
        let date = try makeDecoder().decode(Date.self, from: data)

        let expected = Date(timeIntervalSince1970: 1_767_225_600) // 2026-01-01T00:00:00Z
        XCTAssertEqual(date.timeIntervalSince1970, expected.timeIntervalSince1970, accuracy: 0.01)
    }

    func testHistoryEventWithFractionalSecondTimestampIsKept() throws {
        // An event whose timestamp carries fractional seconds must still decode
        // and be kept (not dropped by LossyArray) under a fractional-aware
        // ISO-8601 decoder.
        let json = """
        [
          {
            "id": "evt-frac",
            "type": "item_added",
            "itemName": "Дробные секунды",
            "timestamp": "2026-01-01T00:00:00.000Z",
            "updatedAt": "2026-01-01T00:00:00.000Z"
          }
        ]
        """
        let data = Data(json.utf8)
        let events = try makeDecoder().decode(LossyArray<HistoryEvent>.self, from: data).elements

        XCTAssertEqual(events.count, 1, "fractional-seconds timestamp must not cause the event to be skipped")
        let expected = Date(timeIntervalSince1970: 1_767_225_600)
        XCTAssertEqual(events[0].timestamp.timeIntervalSince1970,
                       expected.timeIntervalSince1970,
                       accuracy: 0.01)
    }

    // MARK: - (d) Fully valid SyncData round-trips

    func testFullyValidSyncDataDecodesWithCorrectCounts() throws {
        let json = """
        {
          "categories": [
            {
              "id": "cat-1",
              "name": "Овощи",
              "icon": "🥬",
              "color": "#34C759",
              "itemCount": 2,
              "sortOrder": 0,
              "updatedAt": "2026-01-01T00:00:00Z"
            },
            {
              "id": "cat-2",
              "name": "Мясо",
              "icon": "🍖",
              "color": "#FF3B30",
              "itemCount": 1,
              "sortOrder": 1,
              "updatedAt": "2026-01-01T00:00:00Z"
            }
          ],
          "items": [
            {
              "id": "item-1",
              "name": "Брокколи",
              "packagesCount": 2,
              "itemsCount": 5,
              "shelfNumber": 3,
              "freezeDate": "2026-01-01T00:00:00Z",
              "expirationDate": "2026-06-01T00:00:00Z",
              "categoryId": "cat-1",
              "updatedAt": "2026-01-01T00:00:00Z"
            },
            {
              "id": "item-2",
              "name": "Шпинат",
              "packagesCount": 1,
              "itemsCount": 1,
              "shelfNumber": 1,
              "freezeDate": "2026-01-02T00:00:00Z",
              "expirationDate": "2026-05-01T00:00:00Z",
              "categoryId": "cat-1",
              "updatedAt": "2026-01-02T00:00:00Z"
            },
            {
              "id": "item-3",
              "name": "Стейк",
              "packagesCount": 1,
              "itemsCount": 2,
              "shelfNumber": 2,
              "freezeDate": "2026-01-03T00:00:00Z",
              "expirationDate": "2026-07-01T00:00:00Z",
              "categoryId": "cat-2",
              "updatedAt": "2026-01-03T00:00:00Z"
            }
          ],
          "history": [
            {
              "id": "evt-1",
              "type": "item_added",
              "itemName": "Брокколи",
              "timestamp": "2026-01-01T00:00:00Z",
              "updatedAt": "2026-01-01T00:00:00Z"
            },
            {
              "id": "evt-2",
              "type": "packages_changed",
              "itemName": "Шпинат",
              "packagesDelta": -1,
              "timestamp": "2026-01-02T00:00:00Z",
              "updatedAt": "2026-01-02T00:00:00Z"
            }
          ]
        }
        """
        let data = Data(json.utf8)
        let syncData = try makeDecoder().decode(APIClient.SyncData.self, from: data)

        XCTAssertEqual(syncData.categories.count, 2)
        XCTAssertEqual(syncData.items.count, 3)
        XCTAssertEqual(syncData.history.count, 2)
        XCTAssertEqual(syncData.items.map(\.categoryId), ["cat-1", "cat-1", "cat-2"])
        XCTAssertEqual(syncData.history.map(\.type), [.itemAdded, .packagesChanged])
    }

    // MARK: - Integrated: full SyncResponse with server_changes

    func testSyncResponseDecodesServerChangesLossily() throws {
        // The full wire shape: server_version + applied_changes + server_changes.
        // server_changes.items contains one malformed row that must be skipped.
        let json = """
        {
          "server_version": "42",
          "applied_changes": 3,
          "server_changes": {
            "categories": [
              {
                "id": "cat-1",
                "name": "Овощи",
                "itemCount": 1,
                "updatedAt": "2026-01-01T00:00:00Z"
              }
            ],
            "items": [
              {
                "id": "item-1",
                "name": "Брокколи",
                "packagesCount": 1,
                "itemsCount": 1,
                "shelfNumber": 1,
                "freezeDate": "2026-01-01T00:00:00Z",
                "expirationDate": "2026-06-01T00:00:00Z",
                "categoryId": "cat-1",
                "updatedAt": "2026-01-01T00:00:00Z"
              },
              {
                "id": "item-broken"
              }
            ],
            "history": [
              {
                "id": "evt-1",
                "type": "future_event",
                "itemName": "Будущее событие",
                "timestamp": "2026-01-01T00:00:00Z",
                "updatedAt": "2026-01-01T00:00:00Z"
              }
            ]
          }
        }
        """
        let data = Data(json.utf8)
        let response = try makeDecoder().decode(APIClient.SyncResponse.self, from: data)

        XCTAssertEqual(response.serverVersion, "42")
        XCTAssertEqual(response.appliedChanges, 3)
        XCTAssertEqual(response.serverChanges.categories.count, 1)
        XCTAssertEqual(response.serverChanges.items.count, 1, "malformed item skipped in server_changes")
        XCTAssertEqual(response.serverChanges.history.count, 1)
        XCTAssertEqual(response.serverChanges.history[0].type, .unknown)
    }

    // MARK: - PROOF + regression guard: fractional-second dates from the wire

    /// A real Item as the backend serializes it: every date via JS
    /// `Date.toISOString()`, i.e. fractional seconds (".000Z").
    private static let fractionalItemJSON = """
    {
      "id": "item-frac",
      "name": "Дробные секунды",
      "packagesCount": 1,
      "itemsCount": 1,
      "shelfNumber": 1,
      "freezeDate": "2026-01-01T00:00:00.000Z",
      "expirationDate": "2026-06-01T00:00:00.000Z",
      "categoryId": "cat-1",
      "updatedAt": "2026-01-01T12:34:56.789Z"
    }
    """

    /// Documents the BUG: a plain `.iso8601` decoder (the app's OLD config)
    /// rejects fractional seconds, so on-device every dated entity failed to
    /// decode. Refutes G-004's "parses fine" claim on this runtime.
    func testProof_plainISO8601_rejectsFractionalSeconds() {
        let data = Data(Self.fractionalItemJSON.utf8)
        let plain = JSONDecoder()
        plain.dateDecodingStrategy = .iso8601
        XCTAssertThrowsError(
            try plain.decode(Item.self, from: data),
            "Plain .iso8601 is expected to reject fractional seconds; if it does not, G-004 is correct on this runtime"
        )
    }

    /// Proves the FIX: the production decoder (`APIClient.makeJSONDecoder`) parses
    /// the fractional-second dates the backend actually sends.
    func testProof_appDecoder_handlesFractionalSecondInRealItem() throws {
        let data = Data(Self.fractionalItemJSON.utf8)
        let item = try APIClient.makeJSONDecoder().decode(Item.self, from: data)
        XCTAssertEqual(item.id, "item-frac")
        // 2026-01-01T12:34:56.789Z == 1_767_225_600 (midnight) + 45_296s + .789
        XCTAssertEqual(item.updatedAt.timeIntervalSince1970, 1_767_270_896.789, accuracy: 0.01)
    }
}
