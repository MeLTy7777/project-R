"use strict";
// Stage 2: 実装済みの Janus カード(CardDeckCore への実行時の登録 = ProjectR_CardCatalog の RUNTIME_CARDS)。
// 登録数・「その他」の世代・バランスJSONのカードID一覧などを固定している既存のテストは、この一覧から値を作る(ApolloImplemented.cjs と同じ作法)。
const IDS = ["janus_dual_gate", "janus_closed_gate", "janus_reflection", "janus_inversion", "janus_boundary_slash"];
module.exports = { IDS, COUNT: IDS.length };
