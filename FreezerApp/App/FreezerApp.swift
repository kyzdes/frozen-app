import SwiftUI

@main
struct FreezerApp: App {
    @StateObject private var repository = DataRepository()

    var body: some Scene {
        WindowGroup {
            CategoryListView()
                .environmentObject(repository)
        }
    }
}
