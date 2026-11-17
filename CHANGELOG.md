# Changelog

## [0.8.0](https://github.com/studiobimo/backstage/compare/v0.7.0...v0.8.0) (2026-11-17)


### Features

* **admin:** frame the users, media, entry and collection screens ([#451](https://github.com/studiobimo/backstage/issues/451)) ([6c20f72](https://github.com/studiobimo/backstage/commit/6c20f729c7c0ade13601f58f511a3f22217f298b))
* **admin:** give the sidebar and favicon one dot-matrix clapperboard ([#447](https://github.com/studiobimo/backstage/issues/447)) ([44775ad](https://github.com/studiobimo/backstage/commit/44775adf11622ceb26f67b53dcb18246cb5b4186))
* **admin:** group the page editor into frames and pick a layout with cards ([#450](https://github.com/studiobimo/backstage/issues/450)) ([e5f921a](https://github.com/studiobimo/backstage/commit/e5f921a3239d730c7c778dc71e6b53ca32cc8e97))
* **admin:** save settings from one sticky header ([#452](https://github.com/studiobimo/backstage/issues/452)) ([9257d29](https://github.com/studiobimo/backstage/commit/9257d2900aa9c5c587ae64477cc00a6da0d8426e))
* **admin:** share one frame and page title across routes ([#449](https://github.com/studiobimo/backstage/issues/449)) ([20eec79](https://github.com/studiobimo/backstage/commit/20eec79a0eefa2903c4faa817270711b363cbb63))
* **admin:** show who is signed in and let them sign out ([#448](https://github.com/studiobimo/backstage/issues/448)) ([8e43322](https://github.com/studiobimo/backstage/commit/8e433224d3644038a70375b7c940f0128d649d37))
* **core:** add a hexColor field kind and edit it with a swatch ([#445](https://github.com/studiobimo/backstage/issues/445)) ([733eda3](https://github.com/studiobimo/backstage/commit/733eda3c9449fa045375ac8951f78fd3c89aaada))
* **core:** add a logo and a theme color to site settings ([#446](https://github.com/studiobimo/backstage/issues/446)) ([b55d1f1](https://github.com/studiobimo/backstage/commit/b55d1f109e689f9a54092b1d2bdc1c678f734d07))
* **core:** let the first person through Access or a magic link claim ownership ([#434](https://github.com/studiobimo/backstage/issues/434)) ([6121319](https://github.com/studiobimo/backstage/commit/612131916337bd9af3c4f69cdfca1b1f1cca88cc))


### Documentation

* record brand settings in an ADR ([#453](https://github.com/studiobimo/backstage/issues/453)) ([fc42b1b](https://github.com/studiobimo/backstage/commit/fc42b1b6d811b39f7272f2046ef6810e43b0dce2))

## [0.7.0](https://github.com/studiobimo/backstage/compare/v0.6.0...v0.7.0) (2026-11-17)


### Features

* **admin:** add a sign-in page and sign-out for magic link ([#411](https://github.com/studiobimo/backstage/issues/411)) ([f5ca92b](https://github.com/studiobimo/backstage/commit/f5ca92b97d8a45a6712ae08a416762ccd3673817))
* **admin:** add a users page for owners to invite and remove people ([#413](https://github.com/studiobimo/backstage/issues/413)) ([2eae020](https://github.com/studiobimo/backstage/commit/2eae020b4555ce5b037654b048138dbaea4a57f3))
* **admin:** show who saved and published each page and entry ([#409](https://github.com/studiobimo/backstage/issues/409)) ([ebaccd7](https://github.com/studiobimo/backstage/commit/ebaccd737d58f12b5b3d3bdcc2bd97bbb113a2e8))
* **core:** add owner and editor roles with user management ([#412](https://github.com/studiobimo/backstage/issues/412)) ([6c5c9f8](https://github.com/studiobimo/backstage/commit/6c5c9f8e4e337fbec3823fddad41cd13d6b8524c))
* **core:** sign in with a magic link ([#410](https://github.com/studiobimo/backstage/issues/410)) ([79b0dab](https://github.com/studiobimo/backstage/commit/79b0dab53d2c3b00e0a310cad6cfc9e4288510da))
* **site:** add a favicon option to createSite ([#428](https://github.com/studiobimo/backstage/issues/428)) ([a84fc57](https://github.com/studiobimo/backstage/commit/a84fc5786bae6d7b9905e0245aaea1d10b19069c))


### Bug Fixes

* **admin:** follow the admin language for block names in the page editor ([#425](https://github.com/studiobimo/backstage/issues/425)) ([c4f7821](https://github.com/studiobimo/backstage/commit/c4f782171d507379a339dc4baf036cfd8e548a90))
* **site:** bust the edge cache when a page is published ([#427](https://github.com/studiobimo/backstage/issues/427)) ([530c2fa](https://github.com/studiobimo/backstage/commit/530c2fad6bcd9e2a9c5d56bd0a6bb641f56d4763))


### Documentation

* close the consumer setup gaps found building BackUp ([#426](https://github.com/studiobimo/backstage/issues/426)) ([e440180](https://github.com/studiobimo/backstage/commit/e44018086fd3127921233b4fb5f6e2186cb72c99))

## [0.6.0](https://github.com/studiobimo/backstage/compare/v0.5.2...v0.6.0) (2026-11-16)


### Features

* **admin:** pick a page in the link field ([#405](https://github.com/studiobimo/backstage/issues/405)) ([f4933c0](https://github.com/studiobimo/backstage/commit/f4933c0c4b066920a045d13086c81adeafd4892b))
* **core:** link to a page and resolve its address for each locale ([#403](https://github.com/studiobimo/backstage/issues/403)) ([53a575b](https://github.com/studiobimo/backstage/commit/53a575b303ad315d890e949c8c54d4c4a1938890))
* **core:** republish pages that link to a changed page ([#404](https://github.com/studiobimo/backstage/issues/404)) ([72eed0d](https://github.com/studiobimo/backstage/commit/72eed0d03fb259fee5f14fe7ba981778b6b4b82d))
* **devtools:** add seed and unseed for local sample content on the shared dev state ([#399](https://github.com/studiobimo/backstage/issues/399)) ([263f308](https://github.com/studiobimo/backstage/commit/263f3080c5b2fdb837c122eb93aa0ee38ca586d0))


### Bug Fixes

* **admin:** say when a page link has no page chosen, and hide the picker on older sites ([#406](https://github.com/studiobimo/backstage/issues/406)) ([58e8104](https://github.com/studiobimo/backstage/commit/58e8104db4ae98e53e53240ef7eae7da002ee1b5))
* **devtools:** point the seeded spanish header and footer links at spanish pages ([#401](https://github.com/studiobimo/backstage/issues/401)) ([5d9ab92](https://github.com/studiobimo/backstage/commit/5d9ab923c2f6018c4d587c8c57072950dd9ce4ce))

## [0.5.2](https://github.com/studiobimo/backstage/compare/v0.5.1...v0.5.2) (2026-11-16)


### Bug Fixes

* **core:** hand resolved entries their slug and path when rendering blocks ([#392](https://github.com/studiobimo/backstage/issues/392)) ([a787c25](https://github.com/studiobimo/backstage/commit/a787c25d303019ec88d7b3e2fb135bd8e48624a3))

## [0.5.1](https://github.com/studiobimo/backstage/compare/v0.5.0...v0.5.1) (2026-11-16)


### Bug Fixes

* **core:** carry the slug and path of routed entries in resolved references ([#390](https://github.com/studiobimo/backstage/issues/390)) ([95a3783](https://github.com/studiobimo/backstage/commit/95a3783e907fa9a0433318a7b06e680586d8a364))

## [0.5.0](https://github.com/studiobimo/backstage/compare/v0.4.0...v0.5.0) (2026-11-16)


### Features

* **admin:** add an entry reference widget to the block form ([#373](https://github.com/studiobimo/backstage/issues/373)) ([c6531e4](https://github.com/studiobimo/backstage/commit/c6531e48d615eda0f7a7b3f8939949b82f0d9f33))
* **admin:** add collections to the sidebar, breadcrumb and command palette ([#380](https://github.com/studiobimo/backstage/issues/380)) ([069d7bc](https://github.com/studiobimo/backstage/commit/069d7bcafebf1a8fd190010c98782338494a24e1))
* **admin:** edit the address of an entry in a routed collection ([#387](https://github.com/studiobimo/backstage/issues/387)) ([db88338](https://github.com/studiobimo/backstage/commit/db8833867723671e0741551db047cd8a1617472b))
* **admin:** list, create, edit and delete collection entries ([#379](https://github.com/studiobimo/backstage/issues/379)) ([93a269e](https://github.com/studiobimo/backstage/commit/93a269ed7823134435c28be9f4fe9c6ec90bc2bb))
* **admin:** show and drive the pages an entry change republishes ([#383](https://github.com/studiobimo/backstage/issues/383)) ([f237e3f](https://github.com/studiobimo/backstage/commit/f237e3f48e469ff8351e540292b3d1937ff8c54d))
* **core:** add the entries field and render resolved entries in blocks ([#371](https://github.com/studiobimo/backstage/issues/371)) ([2ee8726](https://github.com/studiobimo/backstage/commit/2ee872665909e1085d0d3fae2eb30fcc43b93e45))
* **core:** publish entries of a routed collection with slugs ([#386](https://github.com/studiobimo/backstage/issues/386)) ([1c4c8d9](https://github.com/studiobimo/backstage/commit/1c4c8d9ccdda3b4ee9bb2f93fdb69e6825a5ebfe))
* **core:** republish pages that show an updated entry ([#378](https://github.com/studiobimo/backstage/issues/378)) ([acbf033](https://github.com/studiobimo/backstage/commit/acbf03341bb5eb1d91222f267f3c438558833817))
* **core:** resolve entry references when a page is published ([#372](https://github.com/studiobimo/backstage/issues/372)) ([13592c9](https://github.com/studiobimo/backstage/commit/13592c95f3fdd7e2f03f387dff1e68500907eb88))
* **site:** render entry pages from a collection route ([#385](https://github.com/studiobimo/backstage/issues/385)) ([6cd8252](https://github.com/studiobimo/backstage/commit/6cd82522f2c2db3a979f6ca9e284fd0c3d12e5e0))


### Bug Fixes

* **admin:** show the publish changes label and note for a live page ([#384](https://github.com/studiobimo/backstage/issues/384)) ([1445140](https://github.com/studiobimo/backstage/commit/144514076400bd5e72a92f167eeec4e865f0c72a))

## [0.4.0](https://github.com/studiobimo/backstage/compare/v0.3.0...v0.4.0) (2026-11-16)


### Features

* **admin:** add a preview action to the page editor ([#366](https://github.com/studiobimo/backstage/issues/366)) ([9770973](https://github.com/studiobimo/backstage/commit/97709733f2c73c74ac37f1d510fab6fd6d8b2ace))
* **core:** define collections like blocks ([#365](https://github.com/studiobimo/backstage/issues/365)) ([a8a3629](https://github.com/studiobimo/backstage/commit/a8a362949c3c3253a6a815a944e70f23bec7761a))
* **core:** migrate stored blocks across schema versions ([#362](https://github.com/studiobimo/backstage/issues/362)) ([cd82c94](https://github.com/studiobimo/backstage/commit/cd82c94b0a1ec0e6368d8f71e150bd3947766870))
* **core:** preview a page draft on the site through an expiring link ([#364](https://github.com/studiobimo/backstage/issues/364)) ([181c1b4](https://github.com/studiobimo/backstage/commit/181c1b49f0af5e90fe3778ef7bf56d2e1b201be6))
* **core:** store collection entries and serve them from the admin API ([#368](https://github.com/studiobimo/backstage/issues/368)) ([8046ea7](https://github.com/studiobimo/backstage/commit/8046ea76ff700ae4fcac6a7b3a44dad319545ca1))

## [0.3.0](https://github.com/studiobimo/backstage/compare/v0.2.1...v0.3.0) (2026-11-15)


### Features

* **core:** use the site name, description and social image in createSite's head ([#359](https://github.com/studiobimo/backstage/issues/359)) ([5c08608](https://github.com/studiobimo/backstage/commit/5c086085d9aff4646e9df6d28bc40399283e3ac2))
* **site:** declare the site's locales in its registry ([#352](https://github.com/studiobimo/backstage/issues/352)) ([3e27618](https://github.com/studiobimo/backstage/commit/3e27618e0cba8390aa588a395cb5e1c6d2bbe59f))
* **site:** render the published header, footer and site name ([#353](https://github.com/studiobimo/backstage/issues/353)) ([c322592](https://github.com/studiobimo/backstage/commit/c322592e5af644f2e033dbe8f29e7fc3a8b19390))


### Bug Fixes

* **core:** build the head canonical and alternates with the site's locale config ([#357](https://github.com/studiobimo/backstage/issues/357)) ([2510c28](https://github.com/studiobimo/backstage/commit/2510c289bfeac2388a1fb89a2f9d30aab44d61b2))
* **core:** export the site snapshot constant and records helper from the site entry ([#356](https://github.com/studiobimo/backstage/issues/356)) ([aab7b0c](https://github.com/studiobimo/backstage/commit/aab7b0c06ec35375f879867abe158291342cdbba))
* **core:** hide the language switcher on a single-locale site ([#358](https://github.com/studiobimo/backstage/issues/358)) ([df7f955](https://github.com/studiobimo/backstage/commit/df7f955060f3f60eaea10d8e2d4de20850aca8ff))

## [0.2.1](https://github.com/studiobimo/backstage/compare/v0.2.0...v0.2.1) (2026-11-15)


### Bug Fixes

* **deps:** bump hono from 4.13.14 to 4.13.16 ([#340](https://github.com/studiobimo/backstage/issues/340)) ([bfa03d1](https://github.com/studiobimo/backstage/commit/bfa03d1d2c5eeb2553644f098a2bbcd5497b819d))

## [0.2.0](https://github.com/studiobimo/backstage/compare/v0.1.0...v0.2.0) (2026-11-15)


### ⚠ BREAKING CHANGES

* **core:** shrink the root entry to what a site author uses ([#337](https://github.com/studiobimo/backstage/issues/337))

### Features

* **admin:** publish the site from the settings page ([#315](https://github.com/studiobimo/backstage/issues/315)) ([70283a7](https://github.com/studiobimo/backstage/commit/70283a7d6c7f4f8eb17c1c57e3f6c8301aeb641b))
* **admin:** read the site's locales from the API in the editor and settings ([#328](https://github.com/studiobimo/backstage/issues/328)) ([1b0ad25](https://github.com/studiobimo/backstage/commit/1b0ad252c8aa6d6859f6923b5205242f2487febd))
* **admin:** read the site's locales from the API in the page and media forms ([#327](https://github.com/studiobimo/backstage/issues/327)) ([6a2573c](https://github.com/studiobimo/backstage/commit/6a2573c04aa685497018530f1237fecdc51936d4))
* **admin:** republish every published page in one action ([#321](https://github.com/studiobimo/backstage/issues/321)) ([361bf0d](https://github.com/studiobimo/backstage/commit/361bf0d26da45cce2909c03cdcd0213a0a21d518))
* **admin:** show unpublished changes ([#319](https://github.com/studiobimo/backstage/issues/319)) ([5e2fe4e](https://github.com/studiobimo/backstage/commit/5e2fe4e5479401804b83f3a9b16560b1d6449d69))
* **core:** add createSite to the site/hono entry ([#341](https://github.com/studiobimo/backstage/issues/341)) ([089cd76](https://github.com/studiobimo/backstage/commit/089cd76d790bdd8105e10ea6958107c7431712ad))
* **core:** add the internal and site/hono entries, and test what each can reach ([#332](https://github.com/studiobimo/backstage/issues/332)) ([fa3d74e](https://github.com/studiobimo/backstage/commit/fa3d74e77bbd7c4f8fde992670bca99e60d6c98b))
* **core:** declare a site's locales and default locale in the registry ([#324](https://github.com/studiobimo/backstage/issues/324)) ([57cba5e](https://github.com/studiobimo/backstage/commit/57cba5e8a1d71a758c42facd1fb04c4f145a2318))
* **core:** let the site serve its own block thumbnails ([#305](https://github.com/studiobimo/backstage/issues/305)) ([9ed2f4e](https://github.com/studiobimo/backstage/commit/9ed2f4e3bb3d945bb4e133134b83812ea4d293ee))
* **core:** name any locale in the site's switcher and expose the default ([#329](https://github.com/studiobimo/backstage/issues/329)) ([0b6aa2d](https://github.com/studiobimo/backstage/commit/0b6aa2d59d2a976de2fe5602cf95e5e6679f6ba8))
* **core:** publish the header, footer and site name to the site ([#313](https://github.com/studiobimo/backstage/issues/313)) ([126a57b](https://github.com/studiobimo/backstage/commit/126a57bb0dfa2f0f701951f18387e641d7e3ea14))
* **core:** publish, route and index pages by the registry's locales ([#325](https://github.com/studiobimo/backstage/issues/325)) ([014932b](https://github.com/studiobimo/backstage/commit/014932b89cb41a020d00ae7d9f65d8283f3902bb))
* **core:** read the site snapshot and render its slots ([#314](https://github.com/studiobimo/backstage/issues/314)) ([50ebacb](https://github.com/studiobimo/backstage/commit/50ebacb6488a6c323f40006c8362a281a4d12040))
* **core:** record the version a page was published at ([#317](https://github.com/studiobimo/backstage/issues/317)) ([dba5074](https://github.com/studiobimo/backstage/commit/dba507455872e70ebb2b8e3b2663819166e5aca1))
* **core:** republish every published page in batches ([#320](https://github.com/studiobimo/backstage/issues/320)) ([23fba8c](https://github.com/studiobimo/backstage/commit/23fba8c7c879bfb5b9cf8026ee4f29a69acabd40))
* **core:** validate requests against the configured locales and serve them ([#326](https://github.com/studiobimo/backstage/issues/326)) ([79088eb](https://github.com/studiobimo/backstage/commit/79088ebd9770b26c50c491e90786d4d0f0dd96d7))
* **devtools:** add targets to try a package change in the site ([#245](https://github.com/studiobimo/backstage/issues/245)) ([b78ccf2](https://github.com/studiobimo/backstage/commit/b78ccf27fc0178e72de8add5d35f26fed836b3ea))
* **devtools:** start the admin and site dev servers with one make dev ([#343](https://github.com/studiobimo/backstage/issues/343)) ([51d433d](https://github.com/studiobimo/backstage/commit/51d433d730c0b7a552820404c66da298a5beeb84))


### Bug Fixes

* **admin:** ask before leaving settings or replacing a slot design ([#310](https://github.com/studiobimo/backstage/issues/310)) ([d7354ec](https://github.com/studiobimo/backstage/commit/d7354ec92699619c29e9a2a50467949b692e9ab2))
* **admin:** flag only the list item that has the error ([#299](https://github.com/studiobimo/backstage/issues/299)) ([7569694](https://github.com/studiobimo/backstage/commit/7569694531fdcc3722cbffef1189289e67af45d4))
* **admin:** guard site settings and slots against lost changes ([#312](https://github.com/studiobimo/backstage/issues/312)) ([60dca5a](https://github.com/studiobimo/backstage/commit/60dca5a2e909a4e6d48eb8c2e764667fce45fd78))
* **admin:** read image sizes from the file and fall back to webp ([#304](https://github.com/studiobimo/backstage/issues/304)) ([4acc10a](https://github.com/studiobimo/backstage/commit/4acc10aa3787226a4b967bd66d1121d008faa6ed))
* **admin:** reset the new page form and title every screen ([#290](https://github.com/studiobimo/backstage/issues/290)) ([6f57611](https://github.com/studiobimo/backstage/commit/6f57611789ce03169309c7064a4523dd5e0f3d9a))
* **admin:** say what went wrong when an action fails ([#301](https://github.com/studiobimo/backstage/issues/301)) ([9c40d0b](https://github.com/studiobimo/backstage/commit/9c40d0bc34cd0e343aa41d0310b2c2a99519d4a8))
* **admin:** show each page's real address on the site ([#316](https://github.com/studiobimo/backstage/issues/316)) ([d869fe2](https://github.com/studiobimo/backstage/commit/d869fe205f784c94a0ab78472e201ca8255736b8))
* **admin:** sync the rich text editor and allow its csp needs ([#293](https://github.com/studiobimo/backstage/issues/293)) ([6fabaf4](https://github.com/studiobimo/backstage/commit/6fabaf41b871c051b760a8d598e8fbadd26e2847))
* **core:** declare bindings per environment and fail clearly when one is missing ([#308](https://github.com/studiobimo/backstage/issues/308)) ([ed5df4e](https://github.com/studiobimo/backstage/commit/ed5df4e086e531661d3bbbe44b3d95b713657993))
* **core:** keep other pages' routes on unpublish and walk union fields ([#295](https://github.com/studiobimo/backstage/issues/295)) ([aca6db2](https://github.com/studiobimo/backstage/commit/aca6db279e00e2c508f06d74aa5e84771c1cf592))
* **core:** one home page and atomic page saves ([#288](https://github.com/studiobimo/backstage/issues/288)) ([b7c3878](https://github.com/studiobimo/backstage/commit/b7c38789146404ae3dbcd86864892b6b068fc87d))
* **core:** rebuild the sitemap index from d1 on every publish ([#307](https://github.com/studiobimo/backstage/issues/307)) ([1797533](https://github.com/studiobimo/backstage/commit/17975335ee108b713d439b498d671040a7637bb0))
* **core:** refuse a stale save of site settings and slots ([#311](https://github.com/studiobimo/backstage/issues/311)) ([69dee70](https://github.com/studiobimo/backstage/commit/69dee707656c129a96cf16cec104107e5f116a36))
* **core:** reject unsafe hrefs in link fields by default ([#289](https://github.com/studiobimo/backstage/issues/289)) ([d4f5ede](https://github.com/studiobimo/backstage/commit/d4f5edef82265307fe1f3013c6ec93f27b93de11))
* **core:** require default-locale values to publish ([#302](https://github.com/studiobimo/backstage/issues/302)) ([0a11142](https://github.com/studiobimo/backstage/commit/0a1114237e60b22dd7c1d22f6740c6e4b790fd18))
* **core:** return field errors from the api ([#306](https://github.com/studiobimo/backstage/issues/306)) ([8bf15b3](https://github.com/studiobimo/backstage/commit/8bf15b3a9c941690eb6c2ce09b210864a69ad70e))
* **core:** tighten dev auth, cross-site writes and api request headers ([#291](https://github.com/studiobimo/backstage/issues/291)) ([302b211](https://github.com/studiobimo/backstage/commit/302b2113a4f8de8674eca37b228e3c1cf71d8e8d))
* **core:** validate blocks once and log dropped blocks ([#303](https://github.com/studiobimo/backstage/issues/303)) ([6fdbad5](https://github.com/studiobimo/backstage/commit/6fdbad59aff96f17bb504a406bc1389238d73a3b))
* **site:** localize call-to-action links and use media alt text ([#300](https://github.com/studiobimo/backstage/issues/300)) ([3fa6f2c](https://github.com/studiobimo/backstage/commit/3fa6f2cf820b93f27598cb663cf22cf42a934e78))
* **site:** skip kv for impossible paths and keep one h1 ([#292](https://github.com/studiobimo/backstage/issues/292)) ([ff01d60](https://github.com/studiobimo/backstage/commit/ff01d60d2b84a301d55d0e19bc6819fd5d68f637))
* **site:** use a configured site url for seo urls ([#298](https://github.com/studiobimo/backstage/issues/298)) ([d2165e7](https://github.com/studiobimo/backstage/commit/d2165e74869a5a3b73fe22bd8b6e3575eeb00404))


### Performance

* **core:** keep the pages list cheap with stored missing-translation counts ([#297](https://github.com/studiobimo/backstage/issues/297)) ([6ffdd3b](https://github.com/studiobimo/backstage/commit/6ffdd3bfbe84cf371fff369b5c19070e09e318f8))


### Documentation

* add the m1.6 hardening milestone to the roadmap ([#266](https://github.com/studiobimo/backstage/issues/266)) ([3c56f4c](https://github.com/studiobimo/backstage/commit/3c56f4c281bbd226d25109425b8fc4d64a991993))
* bring the adrs, prd and risks back in line with the code ([#342](https://github.com/studiobimo/backstage/issues/342)) ([1a4beb2](https://github.com/studiobimo/backstage/commit/1a4beb2175f3976cd17a690c3787bb77aa905f6b))


### Refactoring

* **core:** shrink the root entry to what a site author uses ([#337](https://github.com/studiobimo/backstage/issues/337)) ([a59ca41](https://github.com/studiobimo/backstage/commit/a59ca41cb9480cc39f210e752572db60c6290552))

## 0.1.0 (2026-11-11)


### Features

* **admin:** accept image uploads into r2 ([#138](https://github.com/studiobimo/backstage/issues/138)) ([893f0c9](https://github.com/studiobimo/backstage/commit/893f0c9fb23347c3d18000fd403fc36fb829589e))
* **admin:** adapt shadcn's sidebar-08 to coss ui ([#78](https://github.com/studiobimo/backstage/issues/78)) ([d051e1b](https://github.com/studiobimo/backstage/commit/d051e1b474da43395f0b542dd01e2603f70428db))
* **admin:** add a favicon ([#79](https://github.com/studiobimo/backstage/issues/79)) ([9c7f08f](https://github.com/studiobimo/backstage/commit/9c7f08f2290bcfbb29f250ad19f0be5394f9a02f))
* **admin:** add a type specimen page ([#77](https://github.com/studiobimo/backstage/issues/77)) ([6bd0405](https://github.com/studiobimo/backstage/commit/6bd04056f8f5691fe3ea8c8c9036f38690adb1fe))
* **admin:** add the admin app's router, i18n and first route ([#65](https://github.com/studiobimo/backstage/issues/65)) ([2b0fea4](https://github.com/studiobimo/backstage/commit/2b0fea47426939802f44a923a651b1fc8651f0cc))
* **admin:** add the admin shell with coss ui, lineup styling and i18next ([#75](https://github.com/studiobimo/backstage/issues/75)) ([e01978e](https://github.com/studiobimo/backstage/commit/e01978e3656b45d096ee1c5c933a9527b6fd65a5))
* **admin:** add, reorder, duplicate and remove blocks on a page ([#117](https://github.com/studiobimo/backstage/issues/117)) ([f5604f4](https://github.com/studiobimo/backstage/commit/f5604f472e02305c484484aa6069439cc9193d45))
* **admin:** align the header and content, and let width follow the screen ([#184](https://github.com/studiobimo/backstage/issues/184)) ([dd8bf63](https://github.com/studiobimo/backstage/commit/dd8bf633f77f0d1a2e3d8201f3a561cd33d573e5))
* **admin:** create, rename and delete pages ([#111](https://github.com/studiobimo/backstage/issues/111)) ([ce41051](https://github.com/studiobimo/backstage/commit/ce4105132179421bd21083477cb247fe9e215a3b))
* **admin:** edit a block's fields in the page editor ([#162](https://github.com/studiobimo/backstage/issues/162)) ([be08695](https://github.com/studiobimo/backstage/commit/be086958beb9458761642223bb177450719bcc1a))
* **admin:** edit lists of items and reorder them by drag and drop ([#106](https://github.com/studiobimo/backstage/issues/106)) ([566fa6c](https://github.com/studiobimo/backstage/commit/566fa6c860f2649340443a53705850a45b1e5884))
* **admin:** edit localized fields one locale at a time ([#107](https://github.com/studiobimo/backstage/issues/107)) ([f95c46f](https://github.com/studiobimo/backstage/commit/f95c46f262cb2c78659ace9a866a4669aa0d7f81))
* **admin:** edit page seo fields ([#133](https://github.com/studiobimo/backstage/issues/133)) ([d247689](https://github.com/studiobimo/backstage/commit/d2476899804eb39c2ee26c2e5341f8308e179f84))
* **admin:** edit rich text with tiptap ([#108](https://github.com/studiobimo/backstage/issues/108)) ([d5c4a01](https://github.com/studiobimo/backstage/commit/d5c4a0112e4707306bb47c83c861942a3c4faf0a))
* **admin:** edit the header and footer slots and choose a page layout ([#131](https://github.com/studiobimo/backstage/issues/131)) ([0fed933](https://github.com/studiobimo/backstage/commit/0fed9332f4df3f222492713cf2a328230028e0f0))
* **admin:** edit the site settings ([#121](https://github.com/studiobimo/backstage/issues/121)) ([2556619](https://github.com/studiobimo/backstage/commit/255661937e70a9494a73a2892dc93435c78a5509))
* **admin:** fade the page edges with scroll-fade instead of a solid strip ([#125](https://github.com/studiobimo/backstage/issues/125)) ([81a93f2](https://github.com/studiobimo/backstage/commit/81a93f28fc852664c04b2e1167c296805be4a55a))
* **admin:** flag missing translations in the page list and the editor ([#142](https://github.com/studiobimo/backstage/issues/142)) ([30d5ae2](https://github.com/studiobimo/backstage/commit/30d5ae2436d42b4d0d2262736f4d71b7659f1cee))
* **admin:** frame the site's block preview in /blocks ([#229](https://github.com/studiobimo/backstage/issues/229)) ([36fd1a4](https://github.com/studiobimo/backstage/commit/36fd1a4641b0f87ff203b6689e7bd4d2ce2d7e4a))
* **admin:** keep an editor's changes when a save is refused as stale ([#190](https://github.com/studiobimo/backstage/issues/190)) ([4dfd768](https://github.com/studiobimo/backstage/commit/4dfd7687771cb8e2064e60d7c8c929c15eb30e3a))
* **admin:** lay the site settings out in clear sections ([#123](https://github.com/studiobimo/backstage/issues/123)) ([491f4cd](https://github.com/studiobimo/backstage/commit/491f4cd41e096161a7e4aee77969c97640b029b1))
* **admin:** move language, status and save into a sticky editor header ([#188](https://github.com/studiobimo/backstage/issues/188)) ([da26392](https://github.com/studiobimo/backstage/commit/da26392510506e8280735b38c33ef6749b31be13))
* **admin:** move the admin language and theme into the user menu ([#185](https://github.com/studiobimo/backstage/issues/185)) ([8db8570](https://github.com/studiobimo/backstage/commit/8db857076a54fd86397ee261196aa3e9c4a9c6fb))
* **admin:** pick blocks from a command palette with descriptions ([#195](https://github.com/studiobimo/backstage/issues/195)) ([c460eeb](https://github.com/studiobimo/backstage/commit/c460eebcb2a3ae610ed57890c2d91daea98b2e2f))
* **admin:** pick images from the media library for seo and image fields ([#158](https://github.com/studiobimo/backstage/issues/158)) ([16ba74c](https://github.com/studiobimo/backstage/commit/16ba74c8b0b72d0168c066922a578db50ae16428))
* **admin:** preview the example blocks on a dev-only route ([#197](https://github.com/studiobimo/backstage/issues/197)) ([40d79ec](https://github.com/studiobimo/backstage/commit/40d79ece6f1478f6b1dfa446fc9492d973bec412))
* **admin:** publish and unpublish a page to kv ([#144](https://github.com/studiobimo/backstage/issues/144)) ([a57e43f](https://github.com/studiobimo/backstage/commit/a57e43f9a465ab33a9a5c7a60b25d5a6830dfc18))
* **admin:** publish and unpublish from the page editor ([#145](https://github.com/studiobimo/backstage/issues/145)) ([5bf513a](https://github.com/studiobimo/backstage/commit/5bf513a35d0ec79eda74b33bc131a2d51c8e4def))
* **admin:** refuse saves over a newer version ([#134](https://github.com/studiobimo/backstage/issues/134)) ([51bbdeb](https://github.com/studiobimo/backstage/commit/51bbdeb7dc5207b67d93e4c011c3e0a677159e85))
* **admin:** render block forms from json schema ([#102](https://github.com/studiobimo/backstage/issues/102)) ([d6c376c](https://github.com/studiobimo/backstage/commit/d6c376cd50316026594a6b8b37673f41cec05665))
* **admin:** serve block schemas as json schema ([#99](https://github.com/studiobimo/backstage/issues/99)) ([311304c](https://github.com/studiobimo/backstage/commit/311304c05c9735f401b4d07ea4bc764d19511217))
* **admin:** serve slots and layouts and validate slot blocks ([#130](https://github.com/studiobimo/backstage/issues/130)) ([cfc4b9f](https://github.com/studiobimo/backstage/commit/cfc4b9fef7f7d26994a3665532788ed5fe9f8c62))
* **admin:** serve the spa under a strict content security policy ([#85](https://github.com/studiobimo/backstage/issues/85)) ([c262aac](https://github.com/studiobimo/backstage/commit/c262aace8ba162d9537d2dddcf06125d30dad4bb))
* **admin:** sharpen the block form for long forms ([#120](https://github.com/studiobimo/backstage/issues/120)) ([c8c7cf1](https://github.com/studiobimo/backstage/commit/c8c7cf1de2e8e4031558534a8109f6b525084ce6))
* **admin:** show a pending toast while a page publishes ([#191](https://github.com/studiobimo/backstage/issues/191)) ([20dc6ff](https://github.com/studiobimo/backstage/commit/20dc6ffdf809ff7419153b42fbfbac292d74e8fa))
* **admin:** show keyboard shortcuts and jump from a command palette ([#193](https://github.com/studiobimo/backstage/issues/193)) ([f3d93ea](https://github.com/studiobimo/backstage/commit/f3d93ea8e42b6ccc14dee7e7d4f94619d6ad8cf3))
* **admin:** show pages in a table with languages, status and a row menu ([#187](https://github.com/studiobimo/backstage/issues/187)) ([03169fc](https://github.com/studiobimo/backstage/commit/03169fc4acedd32a7be61c27cc05c6c46b324234))
* **admin:** trim the sidebar to what a person can use ([#183](https://github.com/studiobimo/backstage/issues/183)) ([071264c](https://github.com/studiobimo/backstage/commit/071264c09c0f6ef2a7f50d525831d3e8016bd97d))
* **admin:** upload images from the media page ([#139](https://github.com/studiobimo/backstage/issues/139)) ([88629d7](https://github.com/studiobimo/backstage/commit/88629d7d0831796dd001bc9e6ca7b6c8edf30c7d))
* **admin:** verify the access jwt on every api request ([#98](https://github.com/studiobimo/backstage/issues/98)) ([3b4f1da](https://github.com/studiobimo/backstage/commit/3b4f1da31bc06d6d12ec28c8b7618f8635886b2b))
* **core:** add a health route and request ids to both workers ([#113](https://github.com/studiobimo/backstage/issues/113)) ([7dc38dd](https://github.com/studiobimo/backstage/commit/7dc38dde02fbcda726dee31da9ad48e11971d48a))
* **core:** add a pages api with a unique slug per locale ([#110](https://github.com/studiobimo/backstage/issues/110)) ([1e4c7d3](https://github.com/studiobimo/backstage/commit/1e4c7d339ad4459b31558fc5e6c777a53e11798c))
* **core:** add a site settings api ([#119](https://github.com/studiobimo/backstage/issues/119)) ([23c0e7f](https://github.com/studiobimo/backstage/commit/23c0e7fc8239d6ffa2d56065e6f8f73b57228a03))
* **core:** add global slots and page layouts to the registry ([#129](https://github.com/studiobimo/backstage/issues/129)) ([ad9ba5e](https://github.com/studiobimo/backstage/commit/ad9ba5ea6ae314ef265a7058e3eb8a402b3e8b35))
* **core:** add the d1 schema for pages, blocks, media and users ([#87](https://github.com/studiobimo/backstage/issues/87)) ([cecac19](https://github.com/studiobimo/backstage/commit/cecac19da2ef7a76063250863072b1901199e387))
* **core:** count missing translations for each page ([#141](https://github.com/studiobimo/backstage/issues/141)) ([51aeebe](https://github.com/studiobimo/backstage/commit/51aeebe72e2b0c12789841e5d1a8b246cf0f69bd))
* **core:** define blocks as zod schemas with field helpers ([#86](https://github.com/studiobimo/backstage/issues/86)) ([b235d07](https://github.com/studiobimo/backstage/commit/b235d07c7523d0e45659f1a4e796ab0ba342ddd4))
* **core:** export the admin worker and the prebuilt admin spa ([#237](https://github.com/studiobimo/backstage/issues/237)) ([c682fe1](https://github.com/studiobimo/backstage/commit/c682fe133f93b96e5dd36a6297ee34a1e7be8b86))
* **core:** fill page seo from the site settings and list media ([#157](https://github.com/studiobimo/backstage/issues/157)) ([7ed1adc](https://github.com/studiobimo/backstage/commit/7ed1adc99e61e8d67db8fd72f3d9e2982570d2a0))
* **core:** render a page's blocks with a shared blocks component ([#222](https://github.com/studiobimo/backstage/issues/222)) ([f61bd3c](https://github.com/studiobimo/backstage/commit/f61bd3cb1fe069aab64d10ba88798cfa8f88106e))
* **core:** replace the example hero with six generic blocks ([#196](https://github.com/studiobimo/backstage/issues/196)) ([55ac64f](https://github.com/studiobimo/backstage/commit/55ac64f341d046feb6f2b7dc8a6a8bc3032c85c1))
* **core:** save the blocks of a page ([#115](https://github.com/studiobimo/backstage/issues/115)) ([8429c80](https://github.com/studiobimo/backstage/commit/8429c80cb5ee72cd1a8feded964d8b35a4e72ee1))
* **core:** share example blocks and write route keys on publish ([#149](https://github.com/studiobimo/backstage/issues/149)) ([a614e07](https://github.com/studiobimo/backstage/commit/a614e07964f322d8fc5f9f26c481c05c5c7a16b3))
* **core:** ship the d1 migrations with a make target to apply them ([#242](https://github.com/studiobimo/backstage/issues/242)) ([ffbc431](https://github.com/studiobimo/backstage/commit/ffbc4319444a93999bf5621238711fda0466d7dd))
* **core:** store rich text as a fixed tiptap document ([#105](https://github.com/studiobimo/backstage/issues/105)) ([dd9e23a](https://github.com/studiobimo/backstage/commit/dd9e23af55c1790ac267abd9d496e579756a3c5a))
* **devtools:** adopt project-template v0.10.0 ([#83](https://github.com/studiobimo/backstage/issues/83)) ([fbb8e47](https://github.com/studiobimo/backstage/commit/fbb8e47721fba2632b8e6b33c05a4f01ae80adaf))
* **devtools:** adopt project-template v0.11.0 and gate on repo-health ([#96](https://github.com/studiobimo/backstage/issues/96)) ([3999893](https://github.com/studiobimo/backstage/commit/3999893677ad47f437518938c4c573e64d78c18c))
* **devtools:** adopt project-template v0.8.0 ([#68](https://github.com/studiobimo/backstage/issues/68)) ([ebe39df](https://github.com/studiobimo/backstage/commit/ebe39df9db53e8bdf7917a54960d1e0eba060f3b))
* **devtools:** lint sql with sqlfluff ([#91](https://github.com/studiobimo/backstage/issues/91)) ([b7c5d12](https://github.com/studiobimo/backstage/commit/b7c5d12324f367d55ecdeb8d55ba8573253cefbc))
* **site:** add an empty site worker with a strict content security policy ([#84](https://github.com/studiobimo/backstage/issues/84)) ([024f036](https://github.com/studiobimo/backstage/commit/024f036987bece1d25574f17e4cbcf1a4f0e395f))
* **site:** cache pages at the edge ([#151](https://github.com/studiobimo/backstage/issues/151)) ([9072edc](https://github.com/studiobimo/backstage/commit/9072edc1cc4e11ea0233255e762d9abda538b199))
* **site:** generate the sitemap, robots and hreflang links ([#154](https://github.com/studiobimo/backstage/issues/154)) ([de3d888](https://github.com/studiobimo/backstage/commit/de3d888441a6dcec4889a013b9f84c837e897e59))
* **site:** render published pages on the server ([#150](https://github.com/studiobimo/backstage/issues/150)) ([18d06e0](https://github.com/studiobimo/backstage/commit/18d06e08d48cba9e14cdb3ff65e9c4b6bcb51e38))
* **site:** serve a framable preview of one block from its sample ([#227](https://github.com/studiobimo/backstage/issues/227)) ([504d3e2](https://github.com/studiobimo/backstage/commit/504d3e2d67d00b6bc741e4aebc80315ca7fe4d22))
* **site:** serve the sample picture the block previews use ([#228](https://github.com/studiobimo/backstage/issues/228)) ([26639be](https://github.com/studiobimo/backstage/commit/26639be497d64647e5b2222a2531a7505a90df74))
* **site:** style the site's blocks with its own tailwind stylesheet ([#224](https://github.com/studiobimo/backstage/issues/224)) ([341d06f](https://github.com/studiobimo/backstage/commit/341d06ff229db574748dd8c605c5a15b77fca8c9))


### Bug Fixes

* **admin:** clear dead links, breadcrumb and placeholder copy ([#137](https://github.com/studiobimo/backstage/issues/137)) ([00cbd43](https://github.com/studiobimo/backstage/commit/00cbd437ca5b9d44230c2401a170f33441eb0d98))
* **admin:** clear the lizard findings and leave vendored code out ([#100](https://github.com/studiobimo/backstage/issues/100)) ([bedd480](https://github.com/studiobimo/backstage/commit/bedd4806d0be64037a0c98066a2592f89d05c59d))
* **admin:** use one border color for inputs, buttons and groups ([#126](https://github.com/studiobimo/backstage/issues/126)) ([895921d](https://github.com/studiobimo/backstage/commit/895921ddf412bc719b57b7f27a42d95086f11575))
* **admin:** use the created status constant for media uploads ([#153](https://github.com/studiobimo/backstage/issues/153)) ([1a85d38](https://github.com/studiobimo/backstage/commit/1a85d3881a0a579dde8b06fbbc94fc6a8c29d7e7))
* **core:** clear the findings the new repo-health checks raise ([#94](https://github.com/studiobimo/backstage/issues/94)) ([d9d1531](https://github.com/studiobimo/backstage/commit/d9d1531ef59a8f71de8ec7accbdc36a3c10e7123))
* **devtools:** run e2e from the repo root and cover a 360 px phone ([#236](https://github.com/studiobimo/backstage/issues/236)) ([bbd7c97](https://github.com/studiobimo/backstage/commit/bbd7c97665d378befd5f2933922e4584f265356c))
* **site:** copy cached responses before adding security headers ([#156](https://github.com/studiobimo/backstage/issues/156)) ([668c4a9](https://github.com/studiobimo/backstage/commit/668c4a92b20409b4fd23174b0f631dc2604013c6))
* **site:** serve the stylesheet from a content-hashed url ([#234](https://github.com/studiobimo/backstage/issues/234)) ([60c2007](https://github.com/studiobimo/backstage/commit/60c20075fa687582df8b905d661ae464a19e2088))


### Documentation

* add m1 admin screenshots and a list of missing screens ([#182](https://github.com/studiobimo/backstage/issues/182)) ([940593c](https://github.com/studiobimo/backstage/commit/940593ca61ff5e4d9b25eae26bfc02466f2cb0ad))
* add prd, roadmap and decision records ([#59](https://github.com/studiobimo/backstage/issues/59)) ([ccf69b2](https://github.com/studiobimo/backstage/commit/ccf69b2f9f81a357d615312ef2fe0b1de046ae64))
* confirm the admin spa can ship as worker assets from a package ([#73](https://github.com/studiobimo/backstage/issues/73)) ([32048e8](https://github.com/studiobimo/backstage/commit/32048e861bd2f338f4c672ec37699358164d1c94))
* decide how client projects pass the package token ([#241](https://github.com/studiobimo/backstage/issues/241)) ([9b98d7c](https://github.com/studiobimo/backstage/commit/9b98d7c15626b47b85ced18aea830ae16888e993))
* forbid code comments and strip them from the site and package ([#88](https://github.com/studiobimo/backstage/issues/88)) ([bfc263a](https://github.com/studiobimo/backstage/commit/bfc263a085cdff1017e6e8a8d44a1233e63f31e4))
* keep bimo.dev in its own repository ([#70](https://github.com/studiobimo/backstage/issues/70)) ([6eda1c0](https://github.com/studiobimo/backstage/commit/6eda1c0c0cc7176e5aaa8c93ed041e14a0697d07))
* measure react server rendering against the free worker limits ([#69](https://github.com/studiobimo/backstage/issues/69)) ([4ad809b](https://github.com/studiobimo/backstage/commit/4ad809b63ba12bf70fbf4989c94f93289e2b0021))
* plan the site and package split as milestone m1.5 ([#216](https://github.com/studiobimo/backstage/issues/216)) ([02cb8d3](https://github.com/studiobimo/backstage/commit/02cb8d37dd942bb16af6c8d6d8e584b61409cf5a))
* point the guides and the pack test at the admin worker in the package ([#238](https://github.com/studiobimo/backstage/issues/238)) ([1d510bc](https://github.com/studiobimo/backstage/commit/1d510bc7d11daa412bbfab336e18f09578107398))
* record the site and package split in the adrs and prd ([#217](https://github.com/studiobimo/backstage/issues/217)) ([e5bac7e](https://github.com/studiobimo/backstage/commit/e5bac7eb593136ea666fd292e435f3f21a42b3ab))
* say m0 runs in workerd instead of being deployed ([#80](https://github.com/studiobimo/backstage/issues/80)) ([4384506](https://github.com/studiobimo/backstage/commit/438450644609d31ff918b3e185c9288d709c1e5c))
* write down how to put the admin behind cloudflare access ([#81](https://github.com/studiobimo/backstage/issues/81)) ([67ceacd](https://github.com/studiobimo/backstage/commit/67ceacd65d75cf61d0a14c1f2cc88bb72adf032f))
