import { readConfig, setUser } from "./config.js";
import {createUser,getUserByName,deleteAllUsers,getUsers,}from "./lib/db/queries/users.js";
import { Feed, User } from "./lib/db/schema.js";
import { fetchFeed } from "./lib/rss.js";
import {createFeed,getFeeds,getFeedByUrl,markFeedFetched,getNextFeedToFetch,} from "./lib/db/queries/feeds.js";
import {createFeedFollow,deleteFeedFollow,getFeedFollowsForUser,}from "./lib/db/queries/feedFollows.js";
import { createPost } from "./lib/db/queries/posts.js";
import { getPostsForUser } from "./lib/db/queries/posts.js";

type CommandHandler = (
  cmdName: string,
  ...args: string[]
) => Promise<void>;


type UserCommandHandler = (
  cmdName: string,
  user: User,
  ...args: string[]
) => Promise<void>;

function middlewareLoggedIn(
  handler: UserCommandHandler,
): CommandHandler {
  return async (cmdName: string, ...args: string[]) => {
    const config = readConfig();

    const user = await getUserByName(config.currentUserName);

    if (!user) {
      throw new Error(`User ${config.currentUserName} not found`);
    }

    await handler(cmdName, user, ...args);
  };
}

async function handlerLogin(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("username is required");
  }

  const username = args[0];

  const user = await getUserByName(username);

  if (!user) {
    throw new Error("user not found");
  }

  setUser(username);

  console.log(`user ${username} has been set`);
}

async function handlerRegister(cmdName: string, ...args: string[]) {
  if (args.length === 0) {
    throw new Error("username is required");
  }
   const username = args[0];
   const existingUser = await getUserByName(username);

    if (existingUser) {
       throw new Error("user already exists");
    }

    const user = await createUser(username);
    setUser(username);

    console.log(`user ${username} has been registered`);
    console.log(user);

}

async function handlerReset(cmdName: string, ...args: string[]) {
  await deleteAllUsers();
    console.log("database reset successfully");
}

async function handlerUsers(cmdName: string, ...args: string[]) {
  const users = await getUsers();
  const currentUser = readConfig().currentUserName;

  for (const user of users) {
    if (user.name === currentUser) {
      console.log(`* ${user.name} (current)`);
    } else {
      console.log(`* ${user.name}`);
    }
  }
}


async function scrapeFeeds(): Promise<void> {
  const feed = await getNextFeedToFetch();

  console.log(`Fetching feed: ${feed.name}`);

  const rssFeed = await fetchFeed(feed.url);

  await markFeedFetched(feed.id);

  for (const item of rssFeed.channel.item) {
  await createPost(
    item.title,
    item.link,
    item.description,
    new Date(item.pubDate),
    feed.id,
  );
}
}

function parseDuration(durationStr: string): number {
  const regex = /^(\d+)(ms|s|m|h)$/;
  const match = durationStr.match(regex);

  if (!match) {
    throw new Error(`Invalid duration: ${durationStr}`);
  }

  const amount = Number(match[1]);
  const unit = match[2];

  switch (unit) {
    case "ms":
      return amount;
    case "s":
      return amount * 1000;
    case "m":
      return amount * 60 * 1000;
    case "h":
      return amount * 60 * 60 * 1000;
    default:
      throw new Error(`Invalid duration: ${durationStr}`);
  }
}
function handleError(err: unknown) {
  console.error(err);
}

async function handlerAgg(cmdName: string, ...args: string[]) {
  if (args.length !== 1) {
    throw new Error("usage: agg <time_between_reqs>");
  }

  const timeBetweenRequests = parseDuration(args[0]);

  console.log(`Collecting feeds every ${args[0]}`);

  scrapeFeeds().catch(handleError);

  const interval = setInterval(() => {
    scrapeFeeds().catch(handleError);
  }, timeBetweenRequests);

  await new Promise<void>((resolve) => {
    process.on("SIGINT", () => {
      console.log("Shutting down feed aggregator...");
      clearInterval(interval);
      resolve();
    });
  });
}



async function handlerBrowse(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  let limit = 2;

  if (args.length > 0) {
    limit = Number(args[0]);

    if (Number.isNaN(limit)) {
      throw new Error("limit must be a number");
    }
  }

  const posts = await getPostsForUser(user.id, limit);

  for (const post of posts) {
    console.log(`* ${post.title}`);
    console.log(`  ${post.url}`);
    console.log();
  }
}



async function handlerAddFeed(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length < 2) {
    throw new Error("usage: addfeed <name> <url>");
  }

  const name = args[0];
  const url = args[1];

  const feed = await createFeed(name, url, user.id);

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(
    `${feedFollow.userName} is now following ${feedFollow.feedName}`,
  );
}

async function handlerUnfollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length < 1) {
    throw new Error("usage: unfollow <url>");
  }

  const feed = await getFeedByUrl(args[0]);

  if (!feed) {
    throw new Error("feed not found");
  }

  await deleteFeedFollow(user.id, feed.id);
}
async function handlerFeeds(cmdName: string, ...args: string[]) {
  if (args.length > 0) {
    throw new Error("usage: feeds");
  }

  const feeds = await getFeeds();

  for (const item of feeds) {
    console.log(`Name: ${item.feed.name}`);
    console.log(`URL: ${item.feed.url}`);
    console.log(`User: ${item.user.name}`);
    console.log();
  }
}

async function handlerFollowing(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  const feedFollows = await getFeedFollowsForUser(user.id);

  console.log(`Feeds followed by ${user.name}:`);

  for (const feedFollow of feedFollows) {
    console.log(`* ${feedFollow.feedName}`);
  }
}

async function handlerFollow(
  cmdName: string,
  user: User,
  ...args: string[]
) {
  if (args.length < 1) {
    throw new Error("usage: follow <url>");
  }

  const feed = await getFeedByUrl(args[0]);

  if (!feed) {
    throw new Error("feed not found");
  }

  const feedFollow = await createFeedFollow(user.id, feed.id);

  console.log(
    `${feedFollow.userName} is now following ${feedFollow.feedName}`,
  );
}

type CommandsRegistry = Record<string, CommandHandler>;

function registerCommand(
  registry: CommandsRegistry,
  cmdName: string,
  handler: CommandHandler,
): void {
  registry[cmdName] = handler;
}

async function runCommand(
  registry: CommandsRegistry,
  cmdName: string,
  ...args: string[]
): Promise<void> {
  const handler = registry[cmdName];

  if (!handler) {
    throw new Error(`Unknown command: ${cmdName}`);
  }

  await handler(cmdName, ...args);
}

function printFeed(feed: Feed, user: User) {
  console.log("Feed:");
  console.log(`ID: ${feed.id}`);
  console.log(`Name: ${feed.name}`);
  console.log(`URL: ${feed.url}`);
  console.log(`User: ${user.name}`);
}

async function main() {
  const registry: CommandsRegistry = {};

  registerCommand(registry, "login", handlerLogin);
  registerCommand(registry, "register", handlerRegister);
  registerCommand(registry, "reset", handlerReset);
  registerCommand(registry, "users", handlerUsers);
  registerCommand(registry, "agg", handlerAgg);
  
  registerCommand(registry, "feeds", handlerFeeds);
  registerCommand(registry,"follow",middlewareLoggedIn(handlerFollow),);
  registerCommand(registry,"unfollow",middlewareLoggedIn(handlerUnfollow),);
  registerCommand(registry,"following",middlewareLoggedIn(handlerFollowing),);
  registerCommand(registry,"addfeed",middlewareLoggedIn(handlerAddFeed),);
  registerCommand(registry, "browse", middlewareLoggedIn(handlerBrowse));
 
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.error("Not enough arguments");
    process.exit(1);
  }
  const cmdName = args[0];
  const cmdArgs = args.slice(1);
  try {
  await runCommand(registry, cmdName, ...cmdArgs);
} catch (err) {
  console.error(err);
  process.exit(1);
}
process.exit(0);
}


main();