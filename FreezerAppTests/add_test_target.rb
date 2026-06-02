#!/usr/bin/env ruby
# frozen_string_literal: true

# Adds a hosted unit-test target "FreezerAppTests" to FreezerApp.xcodeproj and
# wires it into the shared FreezerApp scheme so `xcodebuild test` discovers it.
#
# This script is idempotent-ish: re-running it removes a pre-existing
# FreezerAppTests target before re-creating it. It does NOT touch the build;
# it only edits the project + shared scheme. Run from the repo root:
#
#   ruby FreezerAppTests/add_test_target.rb
#
# Requires the `xcodeproj` gem (tested with v1.27.0 on ruby 2.6).

require "xcodeproj"

REPO_ROOT     = File.expand_path("..", __dir__)
PROJECT_PATH  = File.join(REPO_ROOT, "FreezerApp", "FreezerApp.xcodeproj")
SCHEME_PATH   = File.join(PROJECT_PATH, "xcshareddata", "xcschemes", "FreezerApp.xcscheme")
TEST_DIR      = File.join(REPO_ROOT, "FreezerAppTests")
APP_NAME      = "FreezerApp"
TEST_NAME     = "FreezerAppTests"
DEPLOY_TARGET = "18.1"

project = Xcodeproj::Project.open(PROJECT_PATH)

app_target = project.targets.find { |t| t.name == APP_NAME }
raise "App target #{APP_NAME.inspect} not found" unless app_target

# Read the settings we must mirror from the app target's Debug config.
app_debug = app_target.build_configurations.find { |c| c.name == "Debug" } ||
            app_target.build_configurations.first
app_bundle_id = app_debug.build_settings["PRODUCT_BUNDLE_IDENTIFIER"]
app_swift_ver = app_debug.build_settings["SWIFT_VERSION"]
raise "Could not read app PRODUCT_BUNDLE_IDENTIFIER" if app_bundle_id.nil?

# The app's product name is $(TARGET_NAME) => executable inside the .app bundle
# is "FreezerApp". TEST_HOST points at that executable; BUNDLE_LOADER = $(TEST_HOST).
test_host = "$(BUILT_PRODUCTS_DIR)/#{APP_NAME}.app/#{APP_NAME}"
test_bundle_id = "#{app_bundle_id}.tests"

puts "App bundle id : #{app_bundle_id}"
puts "App swift ver : #{app_swift_ver}"
puts "Test bundle id: #{test_bundle_id}"
puts "TEST_HOST     : #{test_host}"

# --- Remove any pre-existing test target / group so re-runs stay clean. ---
existing = project.targets.find { |t| t.name == TEST_NAME }
if existing
  puts "Removing existing target #{TEST_NAME} before re-creating."
  # Detach from any aggregate/dependency references first.
  project.targets.each do |t|
    t.dependencies.delete_if { |d| d.target == existing }
  end
  existing.remove_from_project
end
if (old_group = project.main_group.children.find { |c| c.display_name == TEST_NAME })
  old_group.remove_from_project
end

# --- Create the unit-test bundle target. ---
test_target = project.new_target(:unit_test_bundle, TEST_NAME, :ios, DEPLOY_TARGET)

# --- Build settings for a hosted test bundle running on the simulator. ---
test_target.build_configurations.each do |config|
  bs = config.build_settings
  bs["PRODUCT_BUNDLE_IDENTIFIER"]     = test_bundle_id
  bs["PRODUCT_NAME"]                  = "$(TARGET_NAME)"
  bs["IPHONEOS_DEPLOYMENT_TARGET"]    = DEPLOY_TARGET
  bs["SWIFT_VERSION"]                 = app_swift_ver
  bs["GENERATE_INFOPLIST_FILE"]       = "YES"
  bs["TEST_HOST"]                     = test_host
  bs["BUNDLE_LOADER"]                 = "$(TEST_HOST)"
  bs["CODE_SIGNING_ALLOWED"]          = "NO"
  bs["CODE_SIGN_STYLE"]               = "Automatic"
  bs["SWIFT_EMIT_LOC_STRINGS"]        = "NO"
  bs["TARGETED_DEVICE_FAMILY"]        = "1,2"
  bs["ALWAYS_EMBED_SWIFT_STANDARD_LIBRARIES"] = "NO"
  bs["LD_RUNPATH_SEARCH_PATHS"] = [
    "$(inherited)",
    "@executable_path/Frameworks",
    "@loader_path/Frameworks",
    "@executable_path/../../Frameworks"
  ]
end

# --- Group + source files. ---
test_group = project.main_group.new_group(TEST_NAME, TEST_DIR)
%w[SyncDecodeTests.swift HistoryEventTypeTests.swift].each do |file_name|
  abs = File.join(TEST_DIR, file_name)
  raise "Missing test source: #{abs}" unless File.exist?(abs)
  ref = test_group.new_reference(abs)
  test_target.source_build_phase.add_file_reference(ref)
end

# --- The test target depends on the app target. ---
test_target.add_dependency(app_target)

project.save
puts "Saved project with target #{TEST_NAME} (#{test_target.source_build_phase.files.count} sources)."

# --- Wire the test target into the SHARED scheme's TestAction. ---
raise "Shared scheme not found at #{SCHEME_PATH}" unless File.exist?(SCHEME_PATH)
scheme = Xcodeproj::XCScheme.new(SCHEME_PATH)

# Avoid duplicate testables on re-run.
existing_testables = scheme.test_action.testables.select do |t|
  ref = t.buildable_references.first
  ref && ref.target_name == TEST_NAME
end
existing_testables.each { |t| scheme.test_action.remove_testable(t) }

testable = Xcodeproj::XCScheme::TestAction::TestableReference.new(test_target)
scheme.test_action.add_testable(testable)

scheme.save_as(PROJECT_PATH, APP_NAME, true) # shared = true
puts "Added #{TEST_NAME} to shared scheme #{APP_NAME}.xcscheme TestAction."
