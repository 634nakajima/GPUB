# GPUB

ESP32ベースの汎用ステッピングモーター／GPIO制御デバイス。Wi-Fi経由でSocket.IOサーバーに接続し、リアルタイムで制御できます。

## 特徴

- **ステッピングモーター制御** — ステップ数・方向・速度をリアルタイム制御
- **絶対位置移動（motor.goto）** — 現在位置からの差分を自動計算してCW/CCWを決定
- **汎用GPIO出力モード** — モーターピンを汎用スイッチ出力（デジタル／PWM）として転用
- **PWM出力** — 周波数とデューティ比を自由に設定（SSR経由のAC機器制御にも対応）
- **Wi-Fiセットアップ（APモード）** — ブラウザからSSID・パスワード・サーバーURL・デバイスモードを設定
- **OTAアップデート** — ArduinoOTAによる無線ファームウェア更新

---

## ハードウェア

- **MCU**: ESP32
- **モータードライバ**: TB6674PG（2相4ステップ）
- **動作確認モーター**: SM-42BYG011-25（NEMA 17、12V、バイポーラ）
  - R=33Ω、L=48mH → 時定数τ≈1.45ms → 最小ステップ間隔5ms

### ピン割り当て

| 名称 | GPIO | モーターモード | GPIOモード |
|------|------|---------------|------------|
| inA | 5 | Hブリッジ入力A | Output 0 |
| inB | 17 | Hブリッジ入力B | Output 1 |
| PoS | 4 | モーターイネーブル（active LOW） | Output 2 |
| Vs2B | 15 | 電圧イネーブル | Output 3 |
| LED | 16 | 汎用出力 | Output 4 |
| testButton | 2 | テスト／セットアップモードトリガー | 同左 |

---

## セットアップ

1. ESP32にファームウェアを書き込む（`firmware/GPUB/` フォルダをArduino IDEで開く）
2. 初回起動（またはWi-Fi接続失敗時）はAPモードで起動。SSIDは `GPUB`
3. APに接続し `http://192.168.4.1` をブラウザで開く
4. 以下を入力して「Save & Reboot」:
   - Wi-Fi SSID / パスワード
   - Socket.IO サーバーのURL / ポート
   - デバイスモード（Motor / GPIO Only）
5. 再起動後、設定したサーバーに自動接続

通常動作中にtestButtonを2秒以上押すと、セットアップモードに再入場できます。

---

## Socket.IO プロトコル

Socket.IOサーバーはパス `/sx/socket.io/` で接続を受け付けます。

### サーバー → デバイス（コマンド）

| コマンド | ペイロード | 説明 |
|---------|-----------|------|
| `motor.move` | `{ steps, direction, speed }` | ステップ数・方向・速度でモーター駆動。direction: 1=CW, -1=CCW。speed: ms/step（最小5） |
| `motor.goto` | `{ position, speed }` | 絶対位置に移動。差分をデバイス側で計算してCW/CCWを自動決定 |
| `motor.stop` | `{}` | モーター即停止 |
| `motor.status` | `{}` | 現在の状態を要求 |
| `switch.set` | `{ pin, value }` | 出力ピンのデジタルON/OFF。value: 1または0 |
| `switch.pwm` | `{ pin, duty, freq }` | PWM出力。duty: 0〜255、freq: Hz（デフォルト1000） |
| `config.mode` | `{ mode }` | モード切替。`"motor"` または `"gpio"`（セッション中のみ、EEPROMには保存されない） |

#### switch.set / switch.pwm のピン番号

| コマンドのpin | ESP32 GPIO | モーターモード | GPIOモード |
|---|---|---|---|
| 0 | GPIO16（LED） | ✓ 使用可（GPIO16に固定） | ✓ GPIO5 (inA) |
| 1 | GPIO17 | ✗ 使用不可 | ✓ GPIO17 (inB) |
| 2 | GPIO4 | ✗ 使用不可 | ✓ GPIO4 (PoS) |
| 3 | GPIO15 | ✗ 使用不可 | ✓ GPIO15 (Vs2B) |
| 4 | GPIO16 | ✗ 使用不可 | ✓ GPIO16 (LED) |

> モーターモード時は pin=0 のみ使用可。この場合、GPIO16（LEDピン）にマップされます。

### デバイス → サーバー（ACK）

| イベント | ペイロード | 説明 |
|---------|-----------|------|
| `ack.motor.move` | `{ success }` | moveコマンド受理 |
| `ack.motor.goto` | `{ success }` | gotoコマンド受理 |
| `ack.motor.done` | `{ steps, position }` | move/goto完了 |
| `ack.motor.stop` | `{ success }` | stop確認 |
| `ack.motor.status` | `{ state, position, mode }` | 現在状態。state: `"idle"` または `"moving"` |
| `ack.switch.set` | `{ pin, value }` | デジタル出力確認 |
| `ack.switch.pwm` | `{ pin, duty, freq }` | PWM出力確認 |
| `ack.config.mode` | `{ mode }` | モード切替確認 |

---

## EEPROM レイアウト

| アドレス | サイズ | 内容 |
|---------|--------|------|
| 0 | 64 bytes | Wi-Fi SSID |
| 64 | 64 bytes | Wi-Fi パスワード |
| 128 | 128 bytes | Socket.IO サーバーURL |
| 256 | 4 bytes | サーバーポート（int） |
| 260 | 4 bytes | デバイスモード（int: 0=Motor, 1=GPIO） |

---

## サーバーアプリ（`server/`）

ElectronベースのSocket.IOサーバー兼コントロールパネルです。

### 起動（開発）

```bash
cd server
npm install
npm start
```

### ビルド（配布用アプリ）

```bash
cd server
npm run build        # 現在のプラットフォーム向け
npm run build:mac    # macOS (.dmg) — arm64 + x64 の両アーキテクチャ
npm run build:win    # Windows (.exe)
npm run build:linux  # Linux (.AppImage)
```

ビルド成果物は `server/dist/` に出力されます。

### 機能

- **デバイスカード** — 接続デバイスを自動検出してカードを生成。各カードから個別に制御可能
- **デバイス番号** — 接続順に `#1`, `#2`, ... と番号を割り当て
- **EN/JA切り替え** — ヘッダーの「JA/EN」ボタンでUIの表示言語を切り替え
- **REST API** — HTTP経由で外部アプリから制御
- **OSC サーバー** — UDP経由でPure Dataなどから制御
- **ログパネル** — 接続・コマンド・ACKをリアルタイム表示
- **リファレンスパネル** — 「Ref」ボタンでREST/OSCの使用例をモーダル表示

### ポート

| ポート | プロトコル | 用途 |
|--------|-----------|------|
| 3000 | HTTP / WebSocket | Socket.IO（デバイス接続）、REST API |
| 9100 | UDP | OSC |

---

## REST API

### デバイス一覧の取得

```
GET http://localhost:3000/api/devices
```

### コマンド送信

```
POST http://localhost:3000/api/command
Content-Type: application/json

{
  "deviceId": 1,
  "command": "motor.move",
  "data": { "steps": 200, "direction": 1, "speed": 5 }
}
```

`deviceId` はデバイス番号（整数）、IPアドレス（文字列）、socket ID、または `"__all__"`（ブロードキャスト）。省略時はブロードキャスト。

#### p5.js からの使用例

```javascript
// デバイス一覧取得
const res = await fetch('http://localhost:3000/api/devices');
const devices = await res.json();

// モーター制御
await fetch('http://localhost:3000/api/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceId: 1,
    command: 'motor.move',
    data: { steps: 200, direction: 1, speed: 5 }
  })
});

// 絶対位置移動
await fetch('http://localhost:3000/api/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceId: 1,
    command: 'motor.goto',
    data: { position: 500, speed: 5 }
  })
});

// PWM出力（SSR経由のAC機器など）
await fetch('http://localhost:3000/api/command', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    deviceId: 1,
    command: 'switch.pwm',
    data: { pin: 0, duty: 128, freq: 10 }
  })
});
```

---

## OSC インターフェース

UDP ポート 9100 でOSCメッセージを受け付けます。

### メッセージフォーマット

```
/gpub/motor/move   [deviceId] steps direction speed
/gpub/motor/goto   [deviceId] position speed
/gpub/motor/stop   [deviceId]
/gpub/motor/status [deviceId]
/gpub/switch/set   [deviceId] pin value
/gpub/switch/pwm   [deviceId] pin duty freq
/gpub/config/mode  [deviceId] mode
```

`deviceId` はデバイス番号（整数）、IPアドレス、socket ID、または `__all__`。省略するとブロードキャスト。

### Pure Data からの使用例（ELSEライブラリ）

```
; デバイス #1 のモーターを200ステップ CW、5ms/step で駆動
[list /gpub/motor/move 1 200 1 5(
|
[osc.send 9100]

; デバイス #1 を絶対位置 400 に移動
[list /gpub/motor/goto 1 400 5(
|
[osc.send 9100]

; デバイス #1 の pin 0 に PWM（duty=128/255、10Hz）
[list /gpub/switch/pwm 1 0 128 10(
|
[osc.send 9100]

; 全デバイスに一斉送信（deviceId省略）
[list /gpub/motor/stop(
|
[osc.send 9100]
```

### SSR経由のAC機器制御（PWM周波数の目安）

ゼロクロス型SSRを使う場合、AC 50Hz では100回/秒しか開閉できません。

| freq | 推奨用途 |
|------|---------|
| 1〜2 Hz | 緩やかなバースト制御 |
| 5〜10 Hz | 平均的な流量・電力制御 |
| 50 Hz以上 | ゼロクロスSSRでは効果なし |

---

## デバイスシミュレータ

実機なしでサーバーアプリをテストできます。

```bash
cd server
npm run sim        # 1台
npm run sim3       # 3台同時
node simulator.js 5  # 台数を直接指定
```

---

## ファームウェア ファイル構成

Arduino IDEで開く場合は `firmware/GPUB/` フォルダを選択してください。

| ファイル | 役割 |
|---------|------|
| `firmware/GPUB/GPUB.ino` | エントリポイント（setup / loop） |
| `firmware/GPUB/ub.h` | グローバル変数・型定義 |
| `firmware/GPUB/Motor.ino` | ステッパー制御・PWM（LEDC） |
| `firmware/GPUB/ubSocket.ino` | Socket.IO接続・コマンドハンドラ |
| `firmware/GPUB/setupServer.ino` | APモードHTTPサーバー・EEPROM管理 |
| `firmware/GPUB/setupMode.ino` | テストボタン・セットアップモード制御 |
| `firmware/GPUB/timer.ino` | 5msタイマー割り込み |
| `firmware/GPUB/OTA.ino` | OTAアップデート |

## サーバー ファイル構成

| ファイル | 役割 |
|---------|------|
| `server/main.js` | Electronメインプロセス・Socket.IOサーバー・REST API・OSCサーバー |
| `server/preload.js` | IPC ブリッジ（contextBridge） |
| `server/simulator.js` | デバイスシミュレータ |
| `server/src/index.html` | コントロールパネルUI |
| `server/src/renderer.js` | デバイスカード生成・コマンド送信・EN/JA i18n |
| `server/src/styles.css` | ダークテーマスタイル |

## サンプルファイル（`examples/`）

| ファイル | 説明 |
|---------|------|
| `examples/motor-controller.html` | p5.jsサンプル。マウスドラッグでmotor.gotoを送信。REST API使用 |
| `examples/motor-controller.pd` | Pure Dataサンプル。ELSEライブラリのosc.sendでOSC送信 |

## ファームウェア依存ライブラリ

- [arduinoWebSockets](https://github.com/Links2004/arduinoWebSockets)（Socket.IOクライアント）
- [Arduino_JSON](https://github.com/arduino-libraries/Arduino_JSON)
- ESP32 Arduino Core（WiFi、WebServer、EEPROM、ArduinoOTA、Ticker）

---

## License

MIT
