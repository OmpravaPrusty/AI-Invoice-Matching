import os

from dotenv import load_dotenv
from openai import OpenAI


def main() -> None:
    load_dotenv()

    api_key = os.getenv("OPENAI_API_KEY")
    model = os.getenv("OPENAI_MODEL", "gpt-4o-mini")

    if not api_key:
        raise SystemExit(
            "OPENAI_API_KEY is missing. Create a root .env file and set it before running this test."
        )

    client = OpenAI(api_key=api_key)

    try:
        response = client.responses.create(
            model=model,
            input="Reply with exactly: OpenAI connection works.",
            max_output_tokens=32,
        )
    except Exception as error:
        raise SystemExit(f"OpenAI request failed: {error}") from error

    print(response.output_text.strip())


if __name__ == "__main__":
    main()
