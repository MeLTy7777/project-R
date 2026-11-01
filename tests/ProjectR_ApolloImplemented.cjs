"use strict";
// 実装済みのApolloカード(CardDeckCoreへの登録順)の一覧。新しいApolloカードを実装するPhaseは、ここへ1行足すだけでよい
// (登録数・未実装の残り・件数を固定している既存のテストは、この一覧から値を作る)。
const IMPLEMENTED = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer"];
const RESERVED_ALL = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
const STILL_RESERVED = RESERVED_ALL.filter(id => !IMPLEMENTED.includes(id));
// 実装したカードのplugin(IDが現れてよいファイル)。Cutin/GodSummonVisualの既定リストには予約IDも含めてある。
const OWN_PLUGIN = { apollo_golden_volley: "ProjectR_ApolloGoldenVolley.js", apollo_eros_arrow: "ProjectR_ApolloErosArrow.js", apollo_gigas_slayer: "ProjectR_ApolloGigasSlayer.js" };
const SHARED_USERS = ["ProjectR_CardCatalog.js", "ProjectR_CutIn.js", "ProjectR_GodSummonVisual.js", "ProjectR_CombatTestArenaApollo.js", "ProjectR_CharacterPresentation.js"];
module.exports = { IMPLEMENTED, RESERVED_ALL, STILL_RESERVED, OWN_PLUGIN, SHARED_USERS, COUNT: IMPLEMENTED.length };
