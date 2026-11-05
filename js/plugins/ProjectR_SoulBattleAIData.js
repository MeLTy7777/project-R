/*:
 * @target MZ
 * @plugindesc v0.1.0 ProjectR SOUL戦闘 P3-B 回避AIのデータ: 性格(プロファイル)5種とDEVボスの設定を登録します。ロジックは持たず、数値の表だけです。
 * @author ProjectR
 * @base ProjectR_SoulBattleDodge
 * @orderAfter ProjectR_SoulBattleDodge
 *
 * @help
 * ProjectR_SoulBattleAIData.js
 *
 * 回避AI(ProjectR_SoulBattleDodge)に登録する「データ」だけを持ちます。AIのコードはボスや性格ごとに分岐しません。
 * 新しい性格・ボスは、このファイルの表に足すか、別のプラグインから ProjectRSoulBattleDodge.registerProfile / registerBoss を呼ぶだけです。
 * 登録内容は、スキルのダメージ・Cooldown・通常のAction Combatに一切影響しません(ハートの動きの数値だけ)。
 *
 * 性格(arm({ profile: "名前" }) で選ぶ。ProjectRSoulBattleDodge.listProfiles()):
 *   beginner    初心者  反応が遅く、動きも遅い。回避は半分程度。フェイントによく引っかかる。
 *   balanced    バランス P3-Aの既定値に近い標準。被弾後に少し退く。
 *   evasive     回避型  反応が速く、よく動く。回避の頻度が高く、硬直が短い。近接の判定の向きを見て横へ備える。
 *   aggressive  攻撃型  あまり避けず(頻度70%・リスク許容大)、避けるときはプレイヤー側へ詰める。フェイントで大きく崩れる。
 *   boss        ボス    反応が速く、頻度も高いが、連続回避で息切れし、大ダメージで怯む(付け入る隙)。HPフェーズで強くなる。
 *
 * ボス(arm({ boss: "dev_boss" }))の定義:
 *   { id, name, profile, overrides, phases:[{ id, label, hpRatio, overrides }], weakness:{ exhaustAfterDodges, exhaustWindowFrames, exhaustFrames, staggerDamage, staggerFrames },
 *     frameworkBossId }
 *   phases は「HPの割合がこの値以下」で入る。weakness の息切れ・怯みの間は避けられない。
 *   frameworkBossId が ProjectRBossFramework の動作中のボスと一致すれば、そのHP割合とフェーズを(読み取り専用で)参照する。
 *   dev_boss は "dev_boss_soul"(SOULのハートに結び付けたボス)。A16のDEVボス "dev_boss_a16"(イベント3の体)とは別のボスです。
 */
(() => {
    "use strict";
    const root = typeof window !== "undefined" ? window : globalThis;
    const dodge = root.ProjectRSoulBattleDodge;
    if (!dodge || typeof dodge.registerProfile !== "function") return;

    const PROFILES = {
        beginner: {
            label: "初心者", reactionFrames: 20, reactionJitter: 6, moveSpeed: 5, dodgeDistance: 1.2, cooldownFrames: 90, recoveryFrames: 45, returnSpeed: 1.5,
            dodgeFrequency: 0.5, riskTolerance: 0.5, aggression: 0, preferredSide: "none", maxThreats: 4, hitReaction: false, meleeWary: false,
            feintSusceptibility: 1, feintHesitationFrames: 30, feintMemoryFrames: 240, baitRecoveryFrames: 30
        },
        balanced: {
            label: "バランス", reactionFrames: 8, reactionJitter: 2, moveSpeed: 9, dodgeDistance: 1.8, cooldownFrames: 40, recoveryFrames: 24, returnSpeed: 2.5,
            dodgeFrequency: 1, riskTolerance: 0.1, aggression: 0.2, preferredSide: "none", maxThreats: 8, hitReaction: true, hitReactionDistance: 1.2, meleeWary: false,
            feintSusceptibility: 0.5, feintHesitationFrames: 12, feintMemoryFrames: 180, baitRecoveryFrames: 15
        },
        evasive: {
            label: "回避型", reactionFrames: 5, reactionJitter: 0, moveSpeed: 13, dodgeDistance: 2.4, cooldownFrames: 20, recoveryFrames: 12, returnSpeed: 3.5,
            dodgeFrequency: 1, riskTolerance: 0.05, aggression: 0, preferredSide: "away", maxThreats: 16, hitReaction: true, hitReactionDistance: 2, meleeWary: true, meleeSidestepDistance: 1.8,
            feintSusceptibility: 0.3, feintHesitationFrames: 8, feintMemoryFrames: 120, baitRecoveryFrames: 8
        },
        aggressive: {
            label: "攻撃型", reactionFrames: 10, reactionJitter: 3, moveSpeed: 8, dodgeDistance: 1.4, cooldownFrames: 45, recoveryFrames: 15, returnSpeed: 4,
            dodgeFrequency: 0.7, riskTolerance: 0.7, aggression: 0.8, preferredSide: "toward", maxThreats: 6, hitReaction: false, meleeWary: false,
            feintSusceptibility: 0.8, feintHesitationFrames: 20, feintMemoryFrames: 240, baitRecoveryFrames: 40
        },
        boss: {
            label: "ボス", reactionFrames: 6, reactionJitter: 3, moveSpeed: 11, dodgeDistance: 2.2, cooldownFrames: 60, recoveryFrames: 30, returnSpeed: 3,
            dodgeFrequency: 0.85, riskTolerance: 0.15, aggression: 0.3, preferredSide: "none", maxThreats: 16, hitReaction: true, hitReactionDistance: 1.8, meleeWary: true, meleeSidestepDistance: 1.8,
            feintSusceptibility: 0.6, feintHesitationFrames: 18, feintMemoryFrames: 180, baitRecoveryFrames: 45
        }
    };
    const BOSSES = {
        dev_boss: {
            name: "DEVボス(回避する敵ハート)", profile: "boss", frameworkBossId: "dev_boss_soul",   // ProjectR_SoulBattleSandbox の a16 シナリオが、SOULのハートに結び付けて登録するBossFrameworkのボス
            phases: [
                { id: "phase2", label: "第二形態", hpRatio: 0.66, overrides: { reactionFrames: 5, moveSpeed: 13, cooldownFrames: 45 } },
                { id: "enrage", label: "激昂", hpRatio: 0.33, overrides: { dodgeDistance: 2.6, recoveryFrames: 22, cooldownFrames: 30, dodgeFrequency: 1 } }
            ],
            weakness: { exhaustAfterDodges: 3, exhaustWindowFrames: 360, exhaustFrames: 90, staggerDamage: 90, staggerFrames: 60 }
        }
    };
    for (const [id, data] of Object.entries(PROFILES)) {
        const result = dodge.registerProfile(id, data);
        if (!result.ok && typeof console !== "undefined") console.warn("[ProjectR_SoulBattleAIData] profile", id, result.reason);
    }
    for (const [id, def] of Object.entries(BOSSES)) {
        const result = dodge.registerBoss({ id, ...def });
        if (!result.ok && typeof console !== "undefined") console.warn("[ProjectR_SoulBattleAIData] boss", id, result.reason);
    }
    root.ProjectRSoulBattleAIData = Object.freeze({ PROFILE_IDS: Object.freeze(Object.keys(PROFILES)), BOSS_IDS: Object.freeze(Object.keys(BOSSES)) });
})();
