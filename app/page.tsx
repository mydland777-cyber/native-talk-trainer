import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(circle at top, rgba(33,62,110,0.22), transparent 28%), #05070d",
        color: "#f5f7ff",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px 16px",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: "960px",
          background: "rgba(13,17,26,0.94)",
          border: "1px solid #1c2538",
          borderRadius: "24px",
          padding: "32px",
          boxShadow: "0 24px 80px rgba(0,0,0,0.45)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "12px",
            color: "#8fa7cc",
            letterSpacing: "0.14em",
            fontWeight: 700,
          }}
        >
          PERSONAL LANGUAGE TRAINER
        </p>

        <h1
          style={{
            marginTop: "12px",
            marginBottom: "16px",
            fontSize: "40px",
            lineHeight: 1.2,
            fontWeight: 800,
            color: "#f8fbff",
          }}
        >
          Native Talk Trainer
        </h1>

        <p
          style={{
            margin: 0,
            fontSize: "18px",
            lineHeight: 1.9,
            color: "#d8e0ee",
            maxWidth: "760px",
          }}
        >
          英語を「読む」だけではなく、実際の会話でどう聞こえるか、
          どう崩れるか、そしてAIと実際にやり取りしながら話せるようになるための個人用Webアプリです。
        </p>

        <div
          style={{
            marginTop: "30px",
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          <section
            style={{
              background: "#0b111d",
              border: "1px solid #22304a",
              borderRadius: "20px",
              padding: "22px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "12px",
                color: "#8eb8ff",
                letterSpacing: "0.12em",
                fontWeight: 700,
              }}
            >
              STUDY CHAT
            </p>

            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: "24px",
                color: "#ffffff",
              }}
            >
              学習チャット
            </h2>

            <p
              style={{
                margin: "0 0 18px 0",
                fontSize: "15px",
                lineHeight: 1.8,
                color: "#dbe4f3",
              }}
            >
              言いたい内容を自然な英語に直し、発音の崩れ方やカタカナ目安、
              careful / natural / casual の違いまで見ながら確認できます。
            </p>

            <ul
              style={{
                margin: "0 0 20px 0",
                paddingLeft: "20px",
                color: "#cfd9ea",
                lineHeight: 1.9,
                fontSize: "14px",
              }}
            >
              <li>自然な言い換え</li>
              <li>日本語補助</li>
              <li>発音の崩れ表示</li>
              <li>カタカナ目安</li>
              <li>音声再生</li>
            </ul>

            <Link
              href="/chat"
              style={{
                display: "inline-block",
                background: "#7db3ff",
                color: "#07101d",
                textDecoration: "none",
                fontWeight: 800,
                padding: "14px 20px",
                borderRadius: "14px",
                fontSize: "14px",
              }}
            >
              学習チャットを開く
            </Link>
          </section>

          <section
            style={{
              background: "#0b111d",
              border: "1px solid #22304a",
              borderRadius: "20px",
              padding: "22px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px 0",
                fontSize: "12px",
                color: "#8eb8ff",
                letterSpacing: "0.12em",
                fontWeight: 700,
              }}
            >
              FREE TALK
            </p>

            <h2
              style={{
                margin: "0 0 12px 0",
                fontSize: "24px",
                color: "#ffffff",
              }}
            >
              フリートーク
            </h2>

            <p
              style={{
                margin: "0 0 18px 0",
                fontSize: "15px",
                lineHeight: 1.8,
                color: "#dbe4f3",
              }}
            >
              AIと普通に会話を続けるためのモードです。調べるより、
              実際に英語を使って会話する練習に向いています。
            </p>

            <ul
              style={{
                margin: "0 0 20px 0",
                paddingLeft: "20px",
                color: "#cfd9ea",
                lineHeight: 1.9,
                fontSize: "14px",
              }}
            >
              <li>AIと自然に英会話</li>
              <li>会話を続ける練習</li>
              <li>英語メインの返答</li>
              <li>短い日本語補助</li>
              <li>実践寄りの練習</li>
            </ul>

            <Link
              href="/talk"
              style={{
                display: "inline-block",
                background: "#7db3ff",
                color: "#07101d",
                textDecoration: "none",
                fontWeight: 800,
                padding: "14px 20px",
                borderRadius: "14px",
                fontSize: "14px",
              }}
            >
              フリートークを開く
            </Link>
          </section>
        </div>

        <div style={{ marginTop: "34px" }}>
          <h2
            style={{
              fontSize: "18px",
              margin: "0 0 12px 0",
              color: "#f5f7ff",
            }}
          >
            このアプリの使い分け
          </h2>

          <div
            style={{
              background: "#0b111d",
              border: "1px solid #22304a",
              borderRadius: "18px",
              padding: "18px 20px",
            }}
          >
            <p
              style={{
                margin: "0 0 10px 0",
                color: "#dbe4f3",
                fontSize: "15px",
                lineHeight: 1.8,
              }}
            >
              <strong style={{ color: "#ffffff" }}>学習チャット</strong>
              は、
              「これって自然にどう言うの？」
              「この場面なら何て言うの？」
              を調べるモードです。
            </p>

            <p
              style={{
                margin: 0,
                color: "#dbe4f3",
                fontSize: "15px",
                lineHeight: 1.8,
              }}
            >
              <strong style={{ color: "#ffffff" }}>フリートーク</strong>
              は、AI相手に実際に会話を続けるモードです。
            </p>
          </div>
        </div>

        <div style={{ marginTop: "24px" }}>
          <h2
            style={{
              fontSize: "18px",
              margin: "0 0 12px 0",
              color: "#f5f7ff",
            }}
          >
            おすすめの使い方
          </h2>

          <div
            style={{
              background: "#0b111d",
              border: "1px solid #22304a",
              borderRadius: "18px",
              padding: "18px 20px",
            }}
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                gap: "12px",
              }}
            >
              <div
                style={{
                  background: "#101828",
                  border: "1px solid #22304a",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    color: "#8eb8ff",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  STEP 1
                </p>
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "16px",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  学習チャットで調べる
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.8,
                    color: "#dbe4f3",
                  }}
                >
                  言いたい内容を自然な英語にして、発音の崩れ方や聞こえ方を確認します。
                </p>
              </div>

              <div
                style={{
                  background: "#101828",
                  border: "1px solid #22304a",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    color: "#8eb8ff",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  STEP 2
                </p>
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "16px",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  音で確認する
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.8,
                    color: "#dbe4f3",
                  }}
                >
                  careful / natural / casual の音声を聞いて、実際のスピード感に慣れます。
                </p>
              </div>

              <div
                style={{
                  background: "#101828",
                  border: "1px solid #22304a",
                  borderRadius: "16px",
                  padding: "16px",
                }}
              >
                <p
                  style={{
                    margin: "0 0 8px 0",
                    fontSize: "12px",
                    color: "#8eb8ff",
                    letterSpacing: "0.08em",
                    fontWeight: 700,
                  }}
                >
                  STEP 3
                </p>
                <p
                  style={{
                    margin: "0 0 6px 0",
                    fontSize: "16px",
                    color: "#ffffff",
                    fontWeight: 700,
                  }}
                >
                  フリートークで使う
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.8,
                    color: "#dbe4f3",
                  }}
                >
                  調べた表現をそのままAIとの会話で使って、実践的に定着させます。
                </p>
              </div>
            </div>

            <p
              style={{
                margin: "16px 0 0 0",
                fontSize: "14px",
                lineHeight: 1.8,
                color: "#cfd9ea",
              }}
            >
              まず調べてから実際に使う流れにすると、覚えやすさと会話力の両方を伸ばしやすくなります。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}