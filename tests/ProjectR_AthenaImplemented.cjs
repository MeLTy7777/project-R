"use strict";
// Stage 4: 実装済みの Athena カード(CardDeckCore への実行時の登録 = ProjectR_CardCatalog の RUNTIME_CARDS)。
// 登録数・「その他」の世代・バランスJSONのカードID一覧などを固定している既存のテストは、この一覧から値を作る(JanusImplemented.cjs・ThemisImplemented.cjs・ApolloImplemented.cjs と同じ作法)。
const IDS = ["athena_aegis", "athena_spear_circle", "athena_spear_throw", "athena_shield_charge", "athena_counter"];
module.exports = { IDS, COUNT: IDS.length };
