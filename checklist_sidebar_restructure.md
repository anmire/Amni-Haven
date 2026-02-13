# Sidebar Restructure Checklist — v1.7.2

## HTML Changes (app.html)
- [ ] Move theme selector (buttons + RGB/custom/triangle panels) from left sidebar into settings modal as new "Theme" section
- [ ] Remove `.theme-sidebar-section` and `.theme-sidebar-section-content` from sidebar
- [ ] Move `#voice-users` panel from right sidebar to left sidebar (collapsible section, before voice actions)
- [ ] Add settings gear-only icon button at bottom of left sidebar
- [ ] Move `#messages-bubble-btn` from header to left sidebar bottom area
- [ ] Move online presence area to left sidebar bottom (compact)
- [ ] Delete entire `<aside class="right-sidebar">` block
- [ ] Remove `#toggle-right-sidebar` button from header
- [ ] Remove `#mobile-users-btn` button from header (no right sidebar to toggle)
- [ ] Update cache-busting version strings to 1.7.2

## JS Changes (app.js)
- [ ] Remove right sidebar toggle logic from `_setupSidebarToggles()`
- [ ] Remove right sidebar resize setup
- [ ] Remove `mobile-right-open` logic from `_setupMobile()`
- [ ] Remove swipe-right-edge => open right sidebar gesture
- [ ] Update `#open-settings-btn` click handler (now in left sidebar, same modal)
- [ ] Update `_setupMessagesBubble()` — btn now in sidebar, behavior stays same
- [ ] `_renderVoiceUsers()` — no changes needed, still targets `#voice-users` by ID

## CSS Changes (style.css)
- [ ] Remove `.right-sidebar` styles (main block + collapsed + resize handle)
- [ ] Remove all `mobile-right-open` responsive rules
- [ ] Remove `.right-sidebar` from all media queries
- [ ] Add `.sidebar-bottom-actions` styles for gear + messages + online bar at sidebar bottom
- [ ] Add `.sidebar-voice-section` styles for voice users in left sidebar

## CSS Changes (themes.css)
- [ ] Remove all `[data-theme="..."] .right-sidebar` rules

## JS Changes (tutorial.js)
- [ ] Remove or update right-sidebar tutorial step

## Other
- [ ] Update CHANGELOG.md
- [ ] Update package.json version
- [ ] Update architecture docs
