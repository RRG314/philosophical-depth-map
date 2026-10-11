# Privacy — local game, version 1

The game stores responses, revisions, self-ratings, saved questions, discoveries, settings and a local journal label in browser IndexedDB. It requires no registration and sends no game analytics or research records. GitHub Pages/network infrastructure can process ordinary connection metadata. Do not include information you would not want in an exported reflection file.

Settings provides export, validated import and deletion. Export files contain your written responses and are not encrypted. Deleting the local journal does not remove exported files, backups or another browser's journal. Browser eviction/private browsing can remove local progress. Use one tab at a time; no cloud synchronization exists.

The optional AI service is disconnected in the default deployment. If an operator configures it, Settings discloses external processing and requires separate consent. Pressing the guide button sends the current response and item ID to the server/provider, not your entire journal. Disabling consent prevents further requests. It does not retroactively erase provider processing. Application code requests `store:false` and avoids response logging, but provider/platform retention terms still apply. The operator must name the actual processor and terms before activation.

Research enrollment and submission are disabled. Draft study documents are not an invitation to participate or an approved consent process. No minors or adults are enrolled. There is no account deletion service to imply otherwise. Future consent, retention and withdrawal proposals are in research/ethics and require institutional and operational completion before collection.
