import XCTest
@testable import FreezerApp

/// Verifies `HistoryEventType`'s raw-value mapping and its non-throwing
/// fallback to `.unknown` for any unrecognized/legacy value.
final class HistoryEventTypeTests: XCTestCase {

    // Decodes a single JSON string into a `HistoryEventType` using the same
    // ISO-8601 configuration the app uses (irrelevant here, but kept identical).
    private func decodeType(_ rawJSON: String) throws -> HistoryEventType {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601
        let data = Data(rawJSON.utf8)
        return try decoder.decode(HistoryEventType.self, from: data)
    }

    func testCanonicalRawValuesMapToCases() throws {
        let expected: [(String, HistoryEventType)] = [
            ("item_added", .itemAdded),
            ("item_updated", .itemUpdated),
            ("item_deleted", .itemDeleted),
            ("packages_changed", .packagesChanged),
            ("items_changed", .itemsChanged)
        ]

        for (raw, expectedCase) in expected {
            let decoded = try decodeType("\"\(raw)\"")
            XCTAssertEqual(decoded, expectedCase, "raw value '\(raw)' should map to \(expectedCase)")
        }
    }

    func testUnrecognizedRawValueDecodesToUnknown() throws {
        let decoded = try decodeType("\"future_event\"")
        XCTAssertEqual(decoded, .unknown)
    }

    func testLegacyCamelCaseRawValueDecodesToUnknown() throws {
        // The canonical raw value is snake_case "item_added"; the legacy
        // camelCase "itemAdded" is not a recognized raw value and must fall
        // back to .unknown rather than throwing.
        let decoded = try decodeType("\"itemAdded\"")
        XCTAssertEqual(decoded, .unknown)
    }

    func testEmptyStringDecodesToUnknown() throws {
        let decoded = try decodeType("\"\"")
        XCTAssertEqual(decoded, .unknown)
    }
}
