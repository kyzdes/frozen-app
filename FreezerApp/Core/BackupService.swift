import Foundation
import OSLog
import UniformTypeIdentifiers

/// Сервис для экспорта и импорта данных приложения
final class BackupService {
    static let shared = BackupService()

    private let logger = Logger(subsystem: Bundle.main.bundleIdentifier ?? "com.freezerapp", category: "Backup")

    private init() {}

    // MARK: - Data Models for Export

    struct BackupData: Codable {
        let version: String
        let exportDate: Date
        let categories: [Category]
        let items: [Item]
        let history: [HistoryEvent]

        var metadata: BackupMetadata {
            BackupMetadata(
                version: version,
                exportDate: exportDate,
                categoriesCount: categories.count,
                itemsCount: items.count
            )
        }

        init(
            version: String,
            exportDate: Date,
            categories: [Category],
            items: [Item],
            history: [HistoryEvent]
        ) {
            self.version = version
            self.exportDate = exportDate
            self.categories = categories
            self.items = items
            self.history = history
        }

        init(from decoder: Decoder) throws {
            let container = try decoder.container(keyedBy: CodingKeys.self)
            version = try container.decode(String.self, forKey: .version)
            exportDate = try container.decode(Date.self, forKey: .exportDate)
            categories = try container.decode([Category].self, forKey: .categories)
            items = try container.decode([Item].self, forKey: .items)
            history = try container.decodeIfPresent([HistoryEvent].self, forKey: .history) ?? []
        }
    }

    struct BackupMetadata: Codable {
        let version: String
        let exportDate: Date
        let categoriesCount: Int
        let itemsCount: Int
    }

    // MARK: - Export

    /// Экспорт данных в JSON
    func exportData(categories: [Category], items: [Item], history: [HistoryEvent]) throws -> Data {
        let backup = BackupData(
            version: "1.0",
            exportDate: Date(),
            categories: categories,
            items: items,
            history: history
        )

        let encoder = JSONEncoder()
        encoder.dateEncodingStrategy = .iso8601
        encoder.outputFormatting = [.prettyPrinted, .sortedKeys]

        do {
            let data = try encoder.encode(backup)
            logger.info("Data exported successfully: \(categories.count) categories, \(items.count) items")
            return data
        } catch {
            logger.error("Failed to export data: \(error.localizedDescription)")
            throw BackupError.exportFailed(error)
        }
    }

    /// Создание временного файла для экспорта
    func createExportFile(categories: [Category], items: [Item], history: [HistoryEvent]) throws -> URL {
        let data = try exportData(categories: categories, items: items, history: history)

        let dateFormatter = DateFormatter()
        dateFormatter.dateFormat = "yyyy-MM-dd_HHmmss"
        let dateString = dateFormatter.string(from: Date())
        let fileName = "freezer_backup_\(dateString).json"

        let tempDir = FileManager.default.temporaryDirectory
        let fileURL = tempDir.appendingPathComponent(fileName)

        try data.write(to: fileURL)
        logger.info("Export file created: \(fileURL.path)")

        return fileURL
    }

    // MARK: - Import

    /// Импорт данных из JSON
    func importData(from data: Data) throws -> BackupData {
        let decoder = JSONDecoder()
        decoder.dateDecodingStrategy = .iso8601

        do {
            let backup = try decoder.decode(BackupData.self, from: data)
            logger.info("Data imported successfully: \(backup.categories.count) categories, \(backup.items.count) items")
            return backup
        } catch {
            logger.error("Failed to import data: \(error.localizedDescription)")
            throw BackupError.importFailed(error)
        }
    }

    /// Импорт данных из файла
    func importData(from url: URL) throws -> BackupData {
        guard url.startAccessingSecurityScopedResource() else {
            throw BackupError.accessDenied
        }
        defer { url.stopAccessingSecurityScopedResource() }

        let data = try Data(contentsOf: url)
        return try importData(from: data)
    }

    /// Валидация импортированных данных
    func validateBackup(_ backup: BackupData) -> ValidationResult {
        var issues: [String] = []

        // Проверка версии
        if backup.version != "1.0" {
            issues.append("Неподдерживаемая версия бэкапа: \(backup.version)")
        }

        // Проверка дубликатов ID в категориях
        let categoryIds = backup.categories.map { $0.id }
        let uniqueCategoryIds = Set(categoryIds)
        if categoryIds.count != uniqueCategoryIds.count {
            issues.append("Обнаружены дубликаты ID категорий")
        }

        // Проверка дубликатов ID в заготовках
        let itemIds = backup.items.map { $0.id }
        let uniqueItemIds = Set(itemIds)
        if itemIds.count != uniqueItemIds.count {
            issues.append("Обнаружены дубликаты ID заготовок")
        }

        // Проверка истории
        let historyItemIds = backup.history.map { $0.itemId }
        if historyItemIds.contains(where: { !$0.isEmpty == false }) {
            issues.append("Некорректные записи истории")
        }

        // Проверка связности данных (все items должны иметь существующий categoryId)
        let validCategoryIds = Set(backup.categories.map { $0.id })
        let orphanedItems = backup.items.filter { !validCategoryIds.contains($0.categoryId) }
        if !orphanedItems.isEmpty {
            issues.append("Найдено \(orphanedItems.count) заготовок без категории")
        }

        if issues.isEmpty {
            logger.info("Backup validation passed")
            return .valid
        } else {
            logger.warning("Backup validation issues: \(issues.joined(separator: ", "))")
            return .invalid(issues)
        }
    }

    enum ValidationResult {
        case valid
        case invalid([String])

        var isValid: Bool {
            if case .valid = self { return true }
            return false
        }
    }

    // MARK: - iCloud Backup Configuration

    /// Проверка статуса iCloud
    func checkiCloudStatus() -> Bool {
        if let token = FileManager.default.ubiquityIdentityToken {
            logger.info("iCloud available: \(String(describing: token))")
            return true
        } else {
            logger.info("iCloud not available")
            return false
        }
    }

    // MARK: - Errors

    enum BackupError: LocalizedError {
        case exportFailed(Error)
        case importFailed(Error)
        case accessDenied
        case invalidData

        var errorDescription: String? {
            switch self {
            case .exportFailed(let error):
                return "Не удалось экспортировать данные: \(error.localizedDescription)"
            case .importFailed(let error):
                return "Не удалось импортировать данные: \(error.localizedDescription)"
            case .accessDenied:
                return "Нет доступа к файлу"
            case .invalidData:
                return "Некорректные данные в файле"
            }
        }
    }
}

// MARK: - Document Types

extension UTType {
    static let freezerBackup = UTType(exportedAs: "com.freezerapp.backup")
}
