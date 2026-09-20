# Gator

Gator is a command-line RSS feed aggregator built with TypeScript, PostgreSQL, and Drizzle ORM.

It allows users to register and log in, add RSS feeds, follow feeds, collect posts from those feeds, and browse the latest posts from the feeds they follow.

## Requirements

Before running Gator, make sure you have:

* Node.js 22.15.0 or a compatible Node.js version
* npm
* PostgreSQL
* Git

## Setup

### 1. Clone the repository

```bash
git clone  https://github.com/RazanDwikat/gator.git
cd gator
```

### 2. Install dependencies

```bash
npm install
```

### 3. Create the PostgreSQL database

Create a PostgreSQL database named `gator`.

The application expects the following database connection:

```text
postgres://postgres:postgres@localhost:5432/gator?sslmode=disable
```

If your PostgreSQL username, password, host, port, or database name are different, update the database URL in the Gator configuration.

### 4. Configure Gator

Gator uses a configuration file in your home directory.

Create or update:

```text
~/.gatorconfig.json
```

The file should contain:

```json
{
  "db_url": "postgres://postgres:postgres@localhost:5432/gator?sslmode=disable",
  "current_user_name": ""
}
```

The `current_user_name` field is updated when you use the `login` command.

### 5. Run the database migrations

```bash
npx drizzle-kit migrate
```

## Running Gator

Start Gator using:

```bash
npm run start <command> [arguments]
```

### Register a user

```bash
npm run start register <username>
```

Example:

```bash
npm run start register razan
```

### Log in

```bash
npm run start login <username>
```

Example:

```bash
npm run start login razan
```

### Add an RSS feed

```bash
npm run start addfeed "<feed-name>" "<feed-url>"
```

Example:

```bash
npm run start addfeed "Hacker News RSS" "https://hnrss.org/newest"
```

Adding a feed also makes the current user follow that feed.

### List feeds

```bash
npm run start feeds
```

### Follow a feed

```bash
npm run start follow "<feed-url>"
```

### List the feeds you follow

```bash
npm run start following
```

### Aggregate posts

Run the feed aggregator with a time interval:

```bash
npm run start agg <time-between-requests>
```

Example:

```bash
npm run start agg 10s
```

The aggregator periodically fetches the RSS feeds and stores new posts in the database.

Press `Ctrl+C` to stop the aggregator.

### Browse posts

Browse the latest posts from the feeds you follow:

```bash
npm run start browse
```

You can also specify the number of posts:

```bash
npm run start browse 5
```

### Unfollow a feed

```bash
npm run start unfollow "<feed-url>"
```

### List users

```bash
npm run start users
```

### Reset the database

To delete all users and their associated data:

```bash
npm run start reset
```

## Tech Stack

* TypeScript
* Node.js
* PostgreSQL
* Drizzle ORM
* fast-xml-parser
* npm
* Git
