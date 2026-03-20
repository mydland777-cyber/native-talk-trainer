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
          英語・韓国語・中国語を、実際の会話でどう聞こえるか、
          どう崩れるか、どんな場面で自然に使えるかまでまとめて学べる個人用Webアプリです。
        </p>

        <div
          style={{
            marginTop: "30px",
            display: "grid",
            gridTemplateColumns: "1fr",
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
              言いたい内容を自然な英語・韓国語・中国語に直し、
              careful / natural / casual の違いや、
              発音の崩れ方、カタカナ目安、音声までまとめて確認できます。
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
              <li>英語・韓国語・中国語に対応</li>
              <li>自然な言い換え</li>
              <li>日本語補助</li>
              <li>careful / natural / casual 比較</li>
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
        </div>

        <div style={{ marginTop: "34px" }}>
          <h2
            style={{
              fontSize: "18px",
              margin: "0 0 12px 0",
              color: "#f5f7ff",
            }}
          >
            このアプリでできること
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
              では、
              「これって自然にどう言うの？」
              「この場面なら何て言うの？」
              を調べながら、そのまま声に出して練習できます。
            </p>

            <p
              style={{
                margin: 0,
                color: "#dbe4f3",
                fontSize: "15px",
                lineHeight: 1.8,
              }}
            >
              場面ごとに実用的な表現へ直しつつ、発音の崩れ方や聞こえ方まで一緒に確認できます。
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
                  言語を選ぶ
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.8,
                    color: "#dbe4f3",
                  }}
                >
                  英語・韓国語・中国語から学びたい言語を選びます。
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
                  場面に合わせて調べる
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.8,
                    color: "#dbe4f3",
                  }}
                >
                  カフェ・空港・ホテル・友達・仕事など、使いたい場面に合わせて表現を確認します。
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
                  音で確認して口に出す
                </p>
                <p
                  style={{
                    margin: 0,
                    fontSize: "14px",
                    lineHeight: 1.8,
                    color: "#dbe4f3",
                  }}
                >
                  careful / natural / casual の違いを見ながら、音声を聞いてそのまま真似します。
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
              まず意味をつかんで、そのあと音で確認しながら口に出す流れにすると、覚えやすさと実用性の両方を伸ばしやすくなります。
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}