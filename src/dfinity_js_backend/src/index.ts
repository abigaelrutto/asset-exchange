import {
  query,
  update,
  text,
  Record,
  StableBTreeMap,
  Variant,
  Vec,
  Ok,
  Err,
  ic,
  Opt,
  None,
  Some,
  Principal,
  Duration,
  nat64,
  bool,
  Result,
  Canister,
} from "azle";
import {
  Ledger,
  binaryAddressFromAddress,
  binaryAddressFromPrincipal,
  hexAddressFromPrincipal,
} from "azle/canisters/ledger";
//@ts-ignore
import { hashCode } from "hashcode";
// Importing UUID v4 for generating unique identifiers
// @ts-ignore
import { v4 as uuidv4 } from "uuid";

/**
 * This type represents an asset that can be listed on an asset manager.
 * It contains basic properties needed to define an asset.
 */
const Asset = Record({
  id: text,
  name: text,
  description: text,
  image: text,
  createdAt: text,
  updatedAt: Opt(text),
  assetType: text,
  isTokenized: text,
  owner: Principal,
  availableUnits: nat64,
  pricePerUnit: nat64,
});

// Payload structure for creating an asset
const AssetPayload = Record({
  name: text,
  description: text,
  image: text,
  assetType: text,
  isTokenized: text,
  availableUnits: nat64,
  pricePerUnit: nat64,
});

// Payload structure for updating an asset
const UpdateAssetPayload = Record({
  id: text,
  description: text,
  pricePerUnit: nat64,
  image: text,
  isTokenized: text,
});

// Structure representing a ticket
const Ticket = Record({
  id: text,
  assetId: text,
  userId: text,
});

// Structure representing a user
const User = Record({
  id: text,
  principal: Principal,
  name: text,
  email: text,
  phone: text,
  assets: Vec(text),
});

// Payload structure for creating a user
const UserPayload = Record({
  name: text,
  email: text,
  phone: text,
});

// Payload structure for updating a user
const UpdateUserPayload = Record({
  id: text,
  name: text,
  email: text,
  phone: text,
});

export const PaymentStatus = Variant({
  PaymentPending: text,
  Completed: text,
});

export const ReservePayment = Record({
  price: nat64,
  status: text,
  seller: Principal,
  paid_at_block: Opt(nat64),
  memo: nat64,
});

// Variant representing different error types
const ErrorType = Variant({
  NotFound: text,
  InvalidPayload: text,
  PaymentFailed: text,
  PaymentCompleted: text,
});

// Structure representing a user
const UserReturn = Record({
  id: text,
  principal: Principal,
  name: text,
  email: text,
  phone: text,
  assets: Vec(Asset),
});

/**
 * `assetsStorage` - a key-value data structure used to store assets by owners.
 * {@link StableBTreeMap} is a self-balancing tree that acts as durable data storage across canister upgrades.
 * For this contract, `StableBTreeMap` is chosen for the following reasons:
 * - `insert`, `get`, and `remove` operations have constant time complexity (O(1)).
 * - Data stored in the map survives canister upgrades, unlike using HashMap where data is lost after an upgrade.
 *
 * Breakdown of the `StableBTreeMap(text, Asset)` data structure:
 * - The key of the map is an `assetId`.
 * - The value in this map is an asset (`Asset`) related to a given key (`assetId`).
 *
 * Constructor values:
 * 1) 0 - memory id where to initialize a map.
 * 2) 16 - maximum size of the key in bytes.
 * 3) 1024 - maximum size of the value in bytes.
 * Values 2 and 3 are not used directly in the constructor but are utilized by the Azle compiler during compile time.
 */
const assetsStorage = StableBTreeMap(0, text, Asset);
const assetTickets = StableBTreeMap(2, text, Ticket);
const usersStorage = StableBTreeMap(3, text, User);
const pendingPayments = StableBTreeMap(4, nat64, ReservePayment);
const persistedPayments = StableBTreeMap(7, Principal, ReservePayment);

const PAYMENT_RESERVATION_PERIOD = 120n; // reservation period in seconds

const icpCanister = Ledger(Principal.fromText("ryjl3-tyaaa-aaaaa-aaaba-cai"));

// Exporting default Canister module
export default Canister({
  // Function to add an asset
  addAsset: update([AssetPayload], Result(Asset, ErrorType), (payload) => {
    // Check if the payload is a valid object
    if (typeof payload !== "object" || Object.keys(payload).length === 0) {
      return Err({ NotFound: "invalid payload" });
    }
    // Create an asset with a unique id generated using UUID v4
    const asset = {
      id: uuidv4(),
      owner: ic.caller(),
      createdAt: new Date().toISOString(),
      updatedAt: None,
      ...payload,
    };

    // get user with the same principal
    const userOpt = usersStorage.values().filter((user) => {
      return user.principal.toText() === ic.caller().toText();
    });
    if (userOpt.length === 0) {
      // create default user
      const user = {
        id: uuidv4(),
        principal: ic.caller(),
        assets: [asset.id],
        email: "_",
        name: "_",
        phone: "_",
      };
      console.log("nuser", user);
      usersStorage.insert(user.id, user);
    } else {
      // add asset to the user

      const user = userOpt[0];
      const updatedUser = {
        ...user,
        assets: [...user.assets, asset.id],
      };
      console.log("users", updatedUser);
      usersStorage.insert(user.id, updatedUser);
    }

    // Insert the asset into the assetsStorage
    assetsStorage.insert(asset.id, asset);
    return Ok(asset);
  }),

  // get all assets
  getAssets: query([], Vec(Asset), () => {
    return assetsStorage.values();
  }),

  // Function get asset by id
  getAsset: query([text], Result(Asset, ErrorType), (id) => {
    const assetOpt = assetsStorage.get(id);
    if ("None" in assetOpt) {
      return Err({ NotFound: `asset with id=${id} not found` });
    }
    return Ok(assetOpt.Some);
  }),

  // Function to update an asset
  updateAsset: update(
    [UpdateAssetPayload],
    Result(Asset, ErrorType),
    (payload) => {
      console.log("update");
      const assetOpt = assetsStorage.get(payload.id);
      if ("None" in assetOpt) {
        return Err({ NotFound: `asset with id=${payload.id} not found` });
      }
      const asset = assetOpt.Some;
      const updatedAsset = {
        ...asset,
        ...payload,
      };
      console.log(updatedAsset);
      assetsStorage.insert(asset.id, updatedAsset);
      return Ok(updatedAsset);
    }
  ),

  // Function to add a user
  addUser: update([UserPayload], Result(User, ErrorType), (payload) => {
    // Check if the payload is a valid object
    if (typeof payload !== "object" || Object.keys(payload).length === 0) {
      return Err({ NotFound: "invalid payload" });
    }
    // Create a user with a unique id generated using UUID v4
    const user = {
      id: uuidv4(),
      principal: ic.caller(),
      assets: [],
      ...payload,
    };
    // Insert the user into the usersStorage
    usersStorage.insert(user.id, user);
    return Ok(user);
  }),

  // get all users
  getUsers: query([], Vec(UserReturn), () => {
    const users = usersStorage.values();
    return users.map((user) => {
      const userAssets = assetsStorage.values().filter((asset) => {
        return user.assets.includes(asset.id);
      });
      return {
        ...user,
        assets: userAssets,
      };
    });
  }),

  // Function get user by id
  getUser: query([text], Result(UserReturn, ErrorType), (id) => {
    const userOpt = usersStorage.get(id);
    if ("None" in userOpt) {
      return Err({ NotFound: `user with id=${id} not found` });
    }
    const user = userOpt.Some;
    const userAssets = assetsStorage.values().filter((asset) => {
      return user.assets.includes(asset.id);
    });
    return Ok({
      ...user,
      assets: userAssets,
    });
  }),

  // get assets reserved by a user
  getUserAssets: query([text], Vec(Asset), (id) => {
    const userOpt = usersStorage.get(id);
    if ("None" in userOpt) {
      return [];
    }
    const user = userOpt.Some;
    return assetsStorage.values().filter((asset) => {
      return user.assets.includes(asset.id);
    });
  }),

  // Function to update a user
  updateUser: update(
    [UpdateUserPayload],
    Result(User, ErrorType),
    (payload) => {
      const userOpt = usersStorage.get(payload.id);
      if ("None" in userOpt) {
        return Err({ NotFound: `user with id=${payload.id} not found` });
      }
      const user = userOpt.Some;
      const updatedUser = {
        ...user,
        ...payload,
      };
      usersStorage.insert(user.id, updatedUser);
      return Ok(updatedUser);
    }
  ),

  createReservePay: update(
    [text, nat64],
    Result(ReservePayment, ErrorType),
    (assetId, amount) => {
      const assetOpt = assetsStorage.get(assetId);
      if ("None" in assetOpt) {
        return Err({
          NotFound: `cannot reserve Payment: Asset  with id=${assetId} not available`,
        });
      }
      const asset = assetOpt.Some;

      const cost = asset.pricePerUnit * amount;

      const sellerOwner = asset.owner;

      const reservePayment = {
        price: cost,
        status: "pending",
        seller: sellerOwner,
        paid_at_block: None,
        memo: generateCorrelationId(assetId),
      };

      // reduce the available units
      const updatedAsset = {
        ...asset,
        availableUnits: asset.availableUnits - amount,
      };

      // add asset to the user
      // get user with the same principal
      const userOpt = usersStorage.values().filter((user) => {
        return user.principal.toText() === ic.caller().toText();
      });

      asset.updatedAt = Some(new Date().toISOString());

      const clientAsset = {
        ...asset,
        id: uuidv4(),
        availableUnits: amount,
        owner: ic.caller(),
        isTokenized: "false",
      };

      if (userOpt.length === 0) {
        // create default user
        const user = {
          id: uuidv4(),
          principal: ic.caller(),
          assets: [clientAsset.id],
          email: "_",
          name: "_",
          phone: "_",
        };
        console.log("nuser", user);
        usersStorage.insert(user.id, user);
      } else {
        // add asset to the user

        const user = userOpt[0];
        const updatedUser = {
          ...user,
          assets: [...user.assets, clientAsset.id],
        };
        console.log("users", updatedUser);
        usersStorage.insert(user.id, updatedUser);
      }

      assetsStorage.insert(clientAsset.id, clientAsset);

      assetsStorage.insert(asset.id, updatedAsset);

      pendingPayments.insert(reservePayment.memo, reservePayment);
      discardByTimeout(reservePayment.memo, PAYMENT_RESERVATION_PERIOD);
      return Ok(reservePayment);
    }
  ),

  completePayment: update(
    [Principal, text, nat64, nat64, nat64],
    Result(ReservePayment, ErrorType),
    async (reservor, assetId, reservePrice, block, memo) => {
      const paymentVerified = await verifyPaymentInternal(
        reservor,
        reservePrice,
        block,
        memo
      );
      if (!paymentVerified) {
        return Err({
          NotFound: `cannot complete the reserve: cannot verify the payment, memo=${memo}`,
        });
      }
      const pendingReservePayOpt = pendingPayments.remove(memo);
      if ("None" in pendingReservePayOpt) {
        return Err({
          NotFound: `cannot complete the reserve: there is no pending reserve with id=${assetId}`,
        });
      }
      const reservedPay = pendingReservePayOpt.Some;
      const updatedReservePayment = {
        ...reservedPay,
        status: "completed",
        paid_at_block: Some(block),
      };
      const assetOpt = assetsStorage.get(assetId);
      if ("None" in assetOpt) {
        throw Error(`Book with id=${assetId} not found`);
      }
      const asset = assetOpt.Some;
      assetsStorage.insert(asset.id, asset);
      persistedPayments.insert(ic.caller(), updatedReservePayment);
      return Ok(updatedReservePayment);
    }
  ),

  verifyPayment: query(
    [Principal, nat64, nat64, nat64],
    bool,
    async (receiver, amount, block, memo) => {
      return await verifyPaymentInternal(receiver, amount, block, memo);
    }
  ),

  /*
        a helper function to get address from the principal
        the address is later used in the transfer method
    */
  getAddressFromPrincipal: query([Principal], text, (principal) => {
    return hexAddressFromPrincipal(principal, 0);
  }),
});

/*
    a hash function that is used to generate correlation ids for assets.
    also, we use that in the verifyPayment function where we check if the used has actually paid the asset
*/
function hash(input: any): nat64 {
  return BigInt(Math.abs(hashCode().value(input)));
}

// A workaround to make the uuid package work with Azle
globalThis.crypto = {
  // @ts-ignore
  getRandomValues: () => {
    let array = new Uint8Array(32);
    for (let i = 0; i < array.length; i++) {
      array[i] = Math.floor(Math.random() * 256);
    }
    return array;
  },
};

// HELPER FUNCTIONS
function generateCorrelationId(assetId: text): nat64 {
  const correlationId = `${assetId}_${ic.caller().toText()}_${ic.time()}`;
  return hash(correlationId);
}

function discardByTimeout(memo: nat64, delay: Duration) {
  ic.setTimer(delay, () => {
    const asset = pendingPayments.remove(memo);
    console.log(`Reserve discarded ${asset}`);
  });
}
async function verifyPaymentInternal(
  receiver: Principal,
  amount: nat64,
  block: nat64,
  memo: nat64
): Promise<bool> {
  const blockData = await ic.call(icpCanister.query_blocks, {
    args: [{ start: block, length: 1n }],
  });
  const tx = blockData.blocks.find((block) => {
    if ("None" in block.transaction.operation) {
      return false;
    }
    const operation = block.transaction.operation.Some;
    const senderAddress = binaryAddressFromPrincipal(ic.caller(), 0);
    const receiverAddress = binaryAddressFromPrincipal(receiver, 0);
    return (
      block.transaction.memo === memo &&
      hash(senderAddress) === hash(operation.Transfer?.from) &&
      hash(receiverAddress) === hash(operation.Transfer?.to) &&
      amount === operation.Transfer?.amount.e8s
    );
  });
  return tx ? true : false;
}
