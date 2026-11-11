# [0.7.0](https://github.com/labcabrera/rmu-api-strategic/compare/0.6.0...0.7.0) (2026-11-11)


* feat(factions)!: faction players, open reads for members and access per entity ([e960fba](https://github.com/labcabrera/rmu-api-strategic/commit/e960fba35e37aea211b7261ab6888e6384adfdb2))


### Bug Fixes

* poison clock of 12 rounds a minute (spec 079, phase 1) ([b47722c](https://github.com/labcabrera/rmu-api-strategic/commit/b47722ccafab95fc6c325a658c8b14d1f362bdf7))


### Features

* amputation, healing without rest and the day of a death (spec 079, phase 5) ([72efd6a](https://github.com/labcabrera/rmu-api-strategic/commit/72efd6a3e495c15954d8bb75e90046aa426d9b99))
* attack size on the whole size scale (spec 075) ([5e7be73](https://github.com/labcabrera/rmu-api-strategic/commit/5e7be732797379ca5b798ceaaa234cec148539be))
* **characters:** culture sources of the culture ranks (spec 076) ([99d8a28](https://github.com/labcabrera/rmu-api-strategic/commit/99d8a2806902723bd37c3bdea126885c84b8f81b))
* **characters:** intense training, creation as one level, pool choice and saved points (spec 076) ([743ef43](https://github.com/labcabrera/rmu-api-strategic/commit/743ef43bd7450cbfbc1789a7d3199d60091f9d7c))
* **characters:** multilingual language ranks and pool choice on traits (spec 076) ([cc3da3d](https://github.com/labcabrera/rmu-api-strategic/commit/cc3da3dbe1f2698d29f7c59b1d032e12b640c16d))
* **characters:** unarmed attacks of the unarmed skills (spec 076, B-08) ([e7a64bd](https://github.com/labcabrera/rmu-api-strategic/commit/e7a64bd70b020d87d2b6d459c3195b72a62dd010))
* **chronicle:** campaign chronicle chapters ([286f8ff](https://github.com/labcabrera/rmu-api-strategic/commit/286f8ffcbbbf2540dd0b78e4bc7085fc9bc25bfd))
* endurance, load and sleeper talents, deadeye share per range (spec 079, phase 7) ([d3dfac5](https://github.com/labcabrera/rmu-api-strategic/commit/d3dfac51bf01628179dfb1755b6a501a69860e0a))
* **exports:** export format 13 with the development data of spec 076 ([97955e8](https://github.com/labcabrera/rmu-api-strategic/commit/97955e89147156e0c4e939be7c78e5aaa1d2db91))
* faction leader, sheet and cover views, items by holder (spec 071) ([a319579](https://github.com/labcabrera/rmu-api-strategic/commit/a319579f23b2ff371db4d15c595520ce6390aeec))
* fatigue round trip and recovery on rest (spec 077, phase 4) ([f051112](https://github.com/labcabrera/rmu-api-strategic/commit/f05111201abff94f85e21a9812cc6ddf72ea8cb8))
* game members, join requests and access levels (spec 071) ([8bad314](https://github.com/labcabrera/rmu-api-strategic/commit/8bad3144a00bede640c157154175cd545ae2c7e8))
* **games:** follow the new name of a user in members and join requests ([4d8f728](https://github.com/labcabrera/rmu-api-strategic/commit/4d8f72879e658c128c06b1927d996fd31447d30b))
* **games:** intense training and saving development points options (spec 076) ([4c2f1b3](https://github.com/labcabrera/rmu-api-strategic/commit/4c2f1b31fd493f8bbed51eaca472b1a75df41638))
* power level presets, group experience and starting wealth (spec 079, phase 8) ([9448738](https://github.com/labcabrera/rmu-api-strategic/commit/9448738a162c5c2464da33b64fa8881829b4feb2))
* talent purchase rules, restricted talents and lowering flaws (spec 077, phase 3) ([a4322ac](https://github.com/labcabrera/rmu-api-strategic/commit/a4322ac997073aac1d2ca8022d0f81f92430d6b5))
* worn armor in encumbrance and fitted weight (spec 077, phase 1) ([d6ed861](https://github.com/labcabrera/rmu-api-strategic/commit/d6ed861fb8d3d8cfef1c6c8a222e2685b4d98c6e))


### BREAKING CHANGES

* `leaderId` and the summary and cover projections of characters
and factions are gone, and the owner of a character no longer changes it unless
they are a player of its faction.
* GET characters and factions answer summaries to readers
outside the faction, and add-xp is only for the masters.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
* characters can no longer be created by users who are not
players of the game; private games are only read by their members.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>

# [0.6.0](https://github.com/labcabrera/rmu-api-strategic/compare/0.5.2...0.6.0) (2026-11-02)


* feat(factions)!: remove the assignable XP of the factions (spec 049) ([ef6887c](https://github.com/labcabrera/rmu-api-strategic/commit/ef6887c5b4de894c02c7977ef25f60f95e6cd9a2))


### Bug Fixes

* answer 400 for an unknown item type ([f53d408](https://github.com/labcabrera/rmu-api-strategic/commit/f53d408a35f1c7ad784904222e1ff03580dda786))
* **characters:** let an admin add a skill with initial ranks ([1ec9182](https://github.com/labcabrera/rmu-api-strategic/commit/1ec91822befe3e8ac713dcf03859615951456bf5))
* **characters:** only turn a core 404 into a 400 when creating a character ([203b311](https://github.com/labcabrera/rmu-api-strategic/commit/203b311e4940796fb7cc8354b7ff7f39c42cdf21))
* **characters:** publish item.updated when the carried status changes ([08c3e68](https://github.com/labcabrera/rmu-api-strategic/commit/08c3e68bc8332310acb68a80ea39aa9fa75cfe9a))
* **characters:** remove only the poison coating the tactical game spent ([82b2383](https://github.com/labcabrera/rmu-api-strategic/commit/82b2383ffbf08180fe7611568c098c468190bd84))
* delete the characters and factions of a deleted game ([0657f9e](https://github.com/labcabrera/rmu-api-strategic/commit/0657f9e10ac0f9e2055171ccc9a9ae8583a7f1d3))
* drop the deprecated errorCode alias from error bodies ([05672d7](https://github.com/labcabrera/rmu-api-strategic/commit/05672d7b9fa4aeb10727cb95c1c12104bfbedb08))
* **exports:** set the skill category of imported characters ([40e9bec](https://github.com/labcabrera/rmu-api-strategic/commit/40e9beca72305ff99b0df1933cd2ca69b28a18be))
* **games:** delete the games of a deleted realm as a system command ([ae8b2dc](https://github.com/labcabrera/rmu-api-strategic/commit/ae8b2dc08592c98d30003ba4c52f2806274af1bc))
* **items:** delete the items of a deleted game ([2145021](https://github.com/labcabrera/rmu-api-strategic/commit/21450213558c634b4fee9f4ac9bf743db1095ebd))
* let the errors of core reach the client when reading a profession ([0d7214b](https://github.com/labcabrera/rmu-api-strategic/commit/0d7214b0cc0089e5469d74031d24af97bde7fe7a))
* report the error path without the query string ([fe14cf0](https://github.com/labcabrera/rmu-api-strategic/commit/fe14cf0e61897e72b49b56b160b031477c914c7c))
* send the injury severity as a translation key in the recovery days ([a1b986c](https://github.com/labcabrera/rmu-api-strategic/commit/a1b986c745bccebe7628945202a6247badd4332c))
* send translation keys in the recovery params ([986c709](https://github.com/labcabrera/rmu-api-strategic/commit/986c7095d95a95280b61ab8314c67590e7377260))
* shield bashes use the one-handed melee fumble table (spec 034) ([026c718](https://github.com/labcabrera/rmu-api-strategic/commit/026c7187a278c0ffc40e9a3c50cd90b9943e19d8))
* **treasure:** name art objects in words (spec 067) ([b88726f](https://github.com/labcabrera/rmu-api-strategic/commit/b88726f41db23a0cc5071fc2585f651b722a65b2))
* unequip a deleted item and delete the items of a deleted character ([f30a60c](https://github.com/labcabrera/rmu-api-strategic/commit/f30a60c27c13f341b4d1e4e6df1c0d7cdcae8e71))
* **validation:** convert query and route values explicitly ([ec034bf](https://github.com/labcabrera/rmu-api-strategic/commit/ec034bf22f7587613fdcaa8b45ad060b4be4f4ac))


### Features

* add details, 413 and 422 to the error contract ([0ac0d05](https://github.com/labcabrera/rmu-api-strategic/commit/0ac0d05eafc8f2f16d3ee3e5ea5b72c917ec73b3))
* add item modifiers with breakage and their effects on the character sheet ([f522ac6](https://github.com/labcabrera/rmu-api-strategic/commit/f522ac6a71c1167b29a6eafc7beb61ef000b60d0))
* adopt the api-core HTTP contract and repository (spec 020) ([f6ccfbf](https://github.com/labcabrera/rmu-api-strategic/commit/f6ccfbf490f56fe23dd4960876a63d7cdb380f80))
* align the strategic injury treatments with core and tactical ([4672904](https://github.com/labcabrera/rmu-api-strategic/commit/4672904ee0b66008994af66a4a1ba587246005da))
* allocate fighting style ranks to abilities (spec 032) ([692db10](https://github.com/labcabrera/rmu-api-strategic/commit/692db10f192626a84ab672e413da7e852534d580))
* **auth:** validate token issuer and audience ([23284d6](https://github.com/labcabrera/rmu-api-strategic/commit/23284d6972484e66fb098a52829063ef0c763bbf))
* character spellcasting endpoint (spec 030) ([20e6a00](https://github.com/labcabrera/rmu-api-strategic/commit/20e6a00c547cd294e4c5854de2bbabca38b2acc5))
* **characters:** apply talent effects and race talents to the sheet ([c6b19b2](https://github.com/labcabrera/rmu-api-strategic/commit/c6b19b2ec7b564e4566a485143d55884f12c8c7b))
* **characters:** base list limit of the profession turns the next Base list into Closed (spec 064) ([eaee06f](https://github.com/labcabrera/rmu-api-strategic/commit/eaee06fa637765f4b96236d5ff6bd9dab0030f9c))
* **characters:** cultures, bonus development points and creation rules ([5b2fb02](https://github.com/labcabrera/rmu-api-strategic/commit/5b2fb02a9380206cf7694755937aaa073cee91f1))
* **characters:** injuries, conditions, healing and tactical outcomes (spec 013) ([7025c4e](https://github.com/labcabrera/rmu-api-strategic/commit/7025c4e8fe50687f57520d0c7c8f095108c6e611))
* **characters:** limits, surgery, salve, 13-1c and temporary modifiers (spec 068) ([ec35d42](https://github.com/labcabrera/rmu-api-strategic/commit/ec35d421384e4bf273ff85953f0f765238e1119b))
* **characters:** optional skill specialization ([efb1459](https://github.com/labcabrera/rmu-api-strategic/commit/efb1459964572bc3c8fcd906d1dce442cb37ae05))
* **characters:** specializations stored as catalog keys ([2ae2fcc](https://github.com/labcabrera/rmu-api-strategic/commit/2ae2fcc110be2a7213c2fe1ae0714a36171f2b7d))
* **characters:** specific error codes for trait tier and specialization (spec 012) ([26a6dfe](https://github.com/labcabrera/rmu-api-strategic/commit/26a6dfe109465aafaf531104c9030f37abc37ebe))
* **characters:** spell lists, realms and power points (spec 029) ([4ac9f5e](https://github.com/labcabrera/rmu-api-strategic/commit/4ac9f5e43cd9a63872de53a4471a2a65ff9e54d9))
* check who reads and changes characters and their items ([d10021f](https://github.com/labcabrera/rmu-api-strategic/commit/d10021f15f7af93cf4ffab675f7ba4b16ed7983f))
* copy the weapon tags to the items and attacks (spec 032) ([8b1fa7d](https://github.com/labcabrera/rmu-api-strategic/commit/8b1fa7d8a2604ed52fbb9da59aaf229fe4ae2e66))
* crafting quality with materials, masterwork, armor weight and workshop (spec 043) ([3dd1497](https://github.com/labcabrera/rmu-api-strategic/commit/3dd1497a57c5138f94084357ae816810b09f5ffc))
* detect changes in the base aggregate and skip a PATCH without changes ([2c832c4](https://github.com/labcabrera/rmu-api-strategic/commit/2c832c4345094434d2d6a6d086c2096ec8ef7db6)), closes [#storedVersion](https://github.com/labcabrera/rmu-api-strategic/issues/storedVersion)
* **enchantments:** enchantment planner, project aggregate and item outcome (spec 064) ([ff5e97e](https://github.com/labcabrera/rmu-api-strategic/commit/ff5e97eee4b1b50bf8357889ddd2c74337f63629))
* **enchantments:** enchantment projects API (spec 064) ([9a091e6](https://github.com/labcabrera/rmu-api-strategic/commit/9a091e679c1c326e471efc25e35925e876844d2e))
* explain the recovery and poison resistance rolls ([6690fb9](https://github.com/labcabrera/rmu-api-strategic/commit/6690fb9b7bdb616e339680203a62d93d8141cc5a))
* export and import characters and factions ([9e4ba8c](https://github.com/labcabrera/rmu-api-strategic/commit/9e4ba8cf65ab0a55bd174a78348dce533cb54a36))
* **exports:** export format 10 carries the enchantment of the items (spec 064) ([a25b805](https://github.com/labcabrera/rmu-api-strategic/commit/a25b805564e66af802dfed6f847c9f76e08825d1))
* **exports:** export format 12 with injury limits and temporary modifiers (spec 068) ([365a41a](https://github.com/labcabrera/rmu-api-strategic/commit/365a41a84a289012d10edbb2f6c0405de4e26166))
* **factions:** npcs of a faction, checked against npcs and core ([69ec795](https://github.com/labcabrera/rmu-api-strategic/commit/69ec795cae03c1847c4d967a9b9f63f19caf8ce8))
* **games:** add openRounds game option (spec 011) ([bece131](https://github.com/labcabrera/rmu-api-strategic/commit/bece1313346dc36b4c4d8c3d5cb016e267a4ddce))
* **games:** campaign calendar and pass time (spec 065) ([7630433](https://github.com/labcabrera/rmu-api-strategic/commit/7630433f7562a337508516b86dcfc99d0f45ec4f))
* gems, jewelry, sizes, jeweler sale and herbs in play (spec 062) ([4ff12d0](https://github.com/labcabrera/rmu-api-strategic/commit/4ff12d0fdbeeaeff9edea04d89eeeba4d54e4724))
* get /v1/info and admin /v1/stats ([da57a8e](https://github.com/labcabrera/rmu-api-strategic/commit/da57a8eebaa5aace98015c128f49f057c4b2bfbc))
* **items:** add holders, gold, ledger and item operations (spec 023) ([2c7d491](https://github.com/labcabrera/rmu-api-strategic/commit/2c7d491551e307e447dae5f7191a16b9889c4508))
* **items:** add the weapon data tactical combat needs ([fd0263b](https://github.com/labcabrera/rmu-api-strategic/commit/fd0263b2332717b37de1c36f7402c8f28a4d37ea))
* **items:** enchantment of an item, enchantment modifiers and ledger kinds (spec 064) ([5655720](https://github.com/labcabrera/rmu-api-strategic/commit/5655720cf9f0d868a0a759c7533c939a6a68e0c7))
* **items:** magic item quote and creation, charges, gem cut and settings (spec 067) ([2920373](https://github.com/labcabrera/rmu-api-strategic/commit/2920373336cf5e6b481088f5b523163266db2d92))
* **items:** magic items of the catalog, charges and gem settings (spec 067) ([1005511](https://github.com/labcabrera/rmu-api-strategic/commit/100551183498b57c167afc74aaa48665ad81b182))
* **items:** purchase orders and Treasure Law trading tables ([aa2ad0e](https://github.com/labcabrera/rmu-api-strategic/commit/aa2ad0efec393a46c39e6b2a1e7de7274a435685))
* **items:** unstacked purchases, full suits and armor classes (spec 041) ([b524bc0](https://github.com/labcabrera/rmu-api-strategic/commit/b524bc09801e44f12802adbacaa40a1b12f3b4d3))
* let only the owner of a game or an admin manage it and its factions ([dc5ac27](https://github.com/labcabrera/rmu-api-strategic/commit/dc5ac279426ee54855952ff6ea6ea477e7e33149))
* let the players of a game read it and its characters ([4f1a363](https://github.com/labcabrera/rmu-api-strategic/commit/4f1a3635c0217ed388e805c8c59484ce77343125))
* merge the item breakage of a tactical outcome into the character items ([589ca06](https://github.com/labcabrera/rmu-api-strategic/commit/589ca06f222e711413144e0d4136802dff120737))
* name this API as the producer of its events ([6feb805](https://github.com/labcabrera/rmu-api-strategic/commit/6feb805eaa7dac6d29311a2e440a88da86c2756e))
* poisonings, poison rr, antidotes, coatings and export v5 (spec 042) ([d860a97](https://github.com/labcabrera/rmu-api-strategic/commit/d860a973c67c1042ebf6fe8a32ddd1b4e7e89266))
* publish character.updated on every mutation of a character ([79d84b4](https://github.com/labcabrera/rmu-api-strategic/commit/79d84b4f6cd9f88e7c1b94bf25cd60475a95c589))
* publish the events of a new item and of the gold it costs ([6a58a5d](https://github.com/labcabrera/rmu-api-strategic/commit/6a58a5d655293ab03c0421c266bd8c978058f053))
* return the short description and the access type of a game ([a6bb1c1](https://github.com/labcabrera/rmu-api-strategic/commit/a6bb1c15836c7950efc990fc6f198869828a3fa0))
* strength weight of each character attack (spec 040) ([051cbde](https://github.com/labcabrera/rmu-api-strategic/commit/051cbde7501634cd121e017e4c937b2425ac2929))
* **traits:** companion talent and flaw effects on the sheet (spec 039) ([431d7c8](https://github.com/labcabrera/rmu-api-strategic/commit/431d7c89cca175981f2838b6b6630b8a9afc51fa))
* **treasure:** random treasure rolls and awards (spec 067) ([6b8fee9](https://github.com/labcabrera/rmu-api-strategic/commit/6b8fee9e74f93ac111b8e5c33625045d3c4019f5))
* use the common HttpClient with a timeout ([ea7f666](https://github.com/labcabrera/rmu-api-strategic/commit/ea7f6663b67035a908d7367e2b943b86244ecedc))


### BREAKING CHANGES

* no add-xp endpoint and no management.availableXP in the faction
responses; export files are now version 7.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
* **characters:** skill totals change for every character (table 3-0b),
the export format is version 2, and RMU_API_SPELLS_URI is required.

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
