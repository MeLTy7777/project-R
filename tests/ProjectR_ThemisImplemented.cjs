"use strict";
// Stage 3: 実装済みの Themis カード(CardDeckCore への実行時の登録 = ProjectR_CardCatalog の RUNTIME_CARDS)。
// 登録数・「その他」の世代・バランスJSONのカードID一覧などを固定している既存のテストは、この一覧から値を作る(JanusImplemented.cjs・ApolloImplemented.cjs と同じ作法)。
const IDS = ["themis_edict", "themis_chain", "themis_balance", "themis_sin_mark", "themis_verdict"];
module.exports = { IDS, COUNT: IDS.length };
