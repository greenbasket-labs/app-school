import Link from "next/link";

export default function HomePage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        display: "grid",
        placeItems: "center",
        padding: 24,
      }}
    >
      <section
        style={{
          width: "100%",
          maxWidth: 720,
          background: "white",
          borderRadius: 20,
          padding: 40,
          boxShadow: "0 12px 40px rgba(0,0,0,.08)",
        }}
      >
        <p
          style={{
            margin: 0,
            fontWeight: 700,
            letterSpacing: ".08em",
            textTransform: "uppercase",
            fontSize: 13,
          }}
        >
          SkulGo
        </p>

        <div
          style={{
            marginTop: 28,
          }}
        >
          <Link
            href="/login"
            style={{
              display: "inline-block",
              padding: "12px 18px",
              borderRadius: 10,
              background: "#173d2a",
              color: "white",
              textDecoration: "none",
              fontWeight: 700,
            }}
          >
            Sign in
          </Link>
        </div>
      </section>
    </main>
  );
}