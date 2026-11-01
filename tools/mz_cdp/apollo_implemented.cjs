// 実機検証スクリプトの共通: 実装済みのApolloカード(CardDeckCoreへの登録順)。新しいApolloカードを実装するPhaseは、ここへ1行足すだけでよい
// (件数を固定している古い検証スクリプトは、この一覧から値を作る)。tests/ProjectR_ApolloImplemented.cjs と同じ内容を保つ。
const IMPLEMENTED = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_gigas_slayer", "apollo_hyacinthus", "apollo_plague_rain", "apollo_laurel_wreath"];
const RESERVED_ALL = ["apollo_golden_volley", "apollo_eros_arrow", "apollo_lyre_rhythm", "apollo_laurel_wreath", "apollo_hyacinthus", "apollo_gigas_slayer", "apollo_oracle", "apollo_plague_rain"];
const STILL_RESERVED = RESERVED_ALL.filter(id => !IMPLEMENTED.includes(id));
module.exports = { IMPLEMENTED, RESERVED_ALL, STILL_RESERVED, N: IMPLEMENTED.length };
