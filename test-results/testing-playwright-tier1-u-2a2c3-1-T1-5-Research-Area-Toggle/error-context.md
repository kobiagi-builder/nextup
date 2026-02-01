# Page snapshot

```yaml
- generic [ref=e2]:
  - generic [ref=e3]:
    - link "Skip to main content" [ref=e4] [cursor=pointer]:
      - /url: "#main-content"
    - complementary [ref=e5]:
      - generic [ref=e8]: CT
      - navigation [ref=e9]:
        - link "Home" [ref=e10] [cursor=pointer]:
          - /url: /
          - img [ref=e11]
        - link "Portfolio" [ref=e14] [cursor=pointer]:
          - /url: /portfolio
          - img [ref=e15]
      - navigation [ref=e19]:
        - link "Profile" [ref=e20] [cursor=pointer]:
          - /url: /profile
          - img [ref=e21]
        - link "Settings" [ref=e24] [cursor=pointer]:
          - /url: /settings
          - img [ref=e25]
        - 'button "Theme: system" [ref=e28] [cursor=pointer]':
          - img [ref=e29]
    - main [ref=e31]:
      - generic [ref=e33]:
        - heading "Artifact not found" [level=2] [ref=e34]
        - paragraph [ref=e35]: The artifact you're looking for doesn't exist or was deleted.
        - button "Back to Portfolio" [ref=e36] [cursor=pointer]
  - region "Notifications (F8)":
    - list
```