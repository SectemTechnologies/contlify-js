# Contributing to Contlify

Thank you for your interest in contributing to **Contlify**! We welcome bug reports, feature proposals, documentation improvements, and pull requests from the community.

---

## Development Setup

### Prerequisites
- **Node.js**: `>= 18.0.0`
- **npm**: `>= 9.0.0`

### Repository Setup

1. Fork and clone the repository:
   ```bash
   git clone https://github.com/SectemTechnologies/contlify-js.git
   cd contlify-js
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Run type check:
   ```bash
   npm run typecheck
   ```

4. Run unit test suite:
   ```bash
   npm test
   ```

5. Build the distribution bundle:
   ```bash
   npm run build
   ```

---

## Development Guidelines

### Architecture & Design Principles
- **SOLID Principles**: Keep routing, validation, authentication, and database adapters decoupled.
- **Database Agnosticism**: Never add database-specific ORM code (Prisma, Drizzle, SQL) directly into the core `src/` runtime package. Storage operations must remain in adapter interfaces.
- **Backward Compatibility**: Do not introduce breaking changes to exported public APIs without prior discussion and major version increments.
- **Testing**: Every new feature, validator, or route handler must be accompanied by unit tests in `tests/`.

### Branching Convention
- `main`: Production release branch.
- `feature/<description>`: Feature development branches.
- `fix/<description>`: Bug fix branches.

---

## Submitting a Pull Request

1. Create a descriptive feature branch:
   ```bash
   git checkout -b feature/my-new-feature
   ```
2. Make your changes and add tests.
3. Ensure all tests and type checks pass cleanly:
   ```bash
   npm run typecheck && npm test && npm run build
   ```
4. Commit your changes using Conventional Commit messages:
   ```bash
   git commit -m "feat(routing): add support for custom prefix routing"
   ```
5. Push to your fork and submit a Pull Request against the `main` branch.

---

## License

By contributing to Contlify, you agree that your contributions will be licensed under the project's [MIT License](./README.md#license).
