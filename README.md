# ICP Asset Management

This system is an asset management system provides a comprehensive solution for users to manage assets, conduct transactions securely, and maintain user profiles effectively. It leverages modern technologies, robust data structures, and security measures to deliver a reliable and scalable platform for asset management.

## Overview

### Modules and Libraries

- **Azle Framework**: The system utilizes various functionalities and data structures provided by the Azle framework, such as `query`, `update`, `Record`, `StableBTreeMap`, `Variant`, `Vec`, `Ok`, `Err`, `Canister`, etc.
- **UUID**: The UUID library is used for generating unique identifiers.
- **Ledger**: The Ledger module from Azle's canisters is imported for ledger-related operations.
- **Hashcode**: A library for generating hash codes is used to create correlation IDs for assets.
- **Cryptographic Functions**: Global cryptographic functions are implemented for compatibility with the Azle framework.

### Data Structures

1. **Asset**: Represents an asset with properties like `id`, `name`, `description`, `image`, `createdAt`, `updatedAt`, `assetType`, `isTokenized`, `owner`, `availableUnits`, and `pricePerUnit`.
2. **AssetPayload**: Payload structure for creating an asset.
3. **UpdateAssetPayload**: Payload structure for updating an asset.
4. **User**: Represents a user with properties like `id`, `principal`, `name`, `email`, `phone`, and `assets`.
5. **UserPayload**: Payload structure for creating a user.
6. **UpdateUserPayload**: Payload structure for updating a user.
7. **ReservePayment**: Represents a payment reservation with properties like `price`, `status`, `seller`, `paid_at_block`, and `memo`.
8. **PaymentStatus**: Variant representing different payment status types.
9. **ErrorType**: Variant representing different error types.

### Storage

- **StableBTreeMap**: Used for durable storage of assets, users, pending payments, and persisted payments.
- Multiple instances of `StableBTreeMap` are initialized to store different types of data.

### Functions

- **Add Asset**: Function to add a new asset to the system. It checks the validity of the payload, generates a unique ID for the asset, updates the owner's assets list, and inserts the asset into the storage.
- **Get Assets**: Retrieves all assets stored in the system.
- **Get Asset**: Retrieves a specific asset by its ID.
- **Update Asset**: Updates an existing asset with new information.
- **Add User**: Function to add a new user to the system.
- **Get Users**: Retrieves all users along with their associated assets.
- **Get User**: Retrieves a specific user by their ID.
- **Update User**: Updates an existing user's information.
- **Create Reserve Payment**: Creates a payment reservation for a specific asset. It reduces the available units of the asset, associates the payment with the user, and sets a timeout for reservation expiration.
- **Complete Payment**: Completes a payment reservation after verifying the payment details. It updates the payment status and persists the payment details.
- **Verify Payment**: Queries the ledger to verify if a payment has been completed successfully.

### Helper Functions

- **Generate Correlation ID**: Creates a unique correlation ID for payment reservations using a hash function.
- **Discard by Timeout**: Sets a timer to discard payment reservations after a specified period.

### Workflow

1. Users can add assets to the system, update asset information, and view available assets.
2. Payment reservations can be created for assets, and payments can be completed after verification.
3. Users can be added to the system, their information can be updated, and their associated assets can be retrieved.

This system provides a robust platform for managing assets and user transactions while ensuring data integrity and security through the Azle framework.

## Things to be explained in the course

1. What is Ledger? More details here: <https://internetcomputer.org/docs/current/developer-docs/integrations/ledger/>
2. What is Internet Identity? More details here: <https://internetcomputer.org/internet-identity>
3. What is Principal, Identity, Address? <https://internetcomputer.org/internet-identity> | <https://yumieventManager.medium.com/whats-the-difference-between-principal-id-and-account-id-3c908afdc1f9>
4. Canister-to-canister communication and how multi-canister development is done? <https://medium.com/icp-league/explore-backend-multi-canister-development-on-ic-680064b06320>

## How to deploy canisters implemented in the course

### Ledger canister

`./deploy-local-ledger.sh` - deploys a local Ledger canister. IC works differently when run locally so there is no default network token available and you have to deploy it yourself. Remember that it's not a token like ERC-20 in Ethereum, it's a native token for ICP, just deployed separately.
This canister is described in the `dfx.json`:

```markdown
 "ledger_canister": {
   "type": "custom",
   "candid": "https://raw.githubusercontent.com/dfinity/ic/928caf66c35627efe407006230beee60ad38f090/rs/rosetta-api/icp_ledger/ledger.did",
   "wasm": "https://download.dfinity.systems/ic/928caf66c35627efe407006230beee60ad38f090/canisters/ledger-canister.wasm.gz",
   "remote": {
     "id": {
       "ic": "ryjl3-tyaaa-aaaaa-aaaba-cai"
     }
   }
 }
```

`remote.id.ic` - that is the principal of the Ledger canister and it will be available by this principal when you work with the ledger.

Also, in the scope of this script, a minter identity is created which can be used for minting tokens
for the testing purposes.
Additionally, the default identity is pre-populated with 1000_000_000_000 e8s which is equal to 10_000 * 10**8 ICP.
The decimals value for ICP is 10**8.

List identities:
`dfx identity list`

Switch to the minter identity:
`dfx identity use minter`

Transfer ICP:
`dfx ledger transfer <ADDRESS>  --memo 0 --icp 100 --fee 0`
where:

- `--memo` is some correlation id that can be set to identify some particular transactions (we use that in the eventManager canister).
- `--icp` is the transfer amount
- `--fee` is the transaction fee. In this case it's 0 because we make this transfer as the minter idenity thus this transaction is of type MINT, not TRANSFER.
- `<ADDRESS>` is the address of the recipient. To get the address from the principal, you can use the helper function from the eventManager canister - `getAddressFromPrincipal(principal: Principal)`, it can be called via the Candid UI.

### Internet identity canister

`dfx deploy internet_identity` - that is the canister that handles the authentication flow. Once it's deployed, the `js-agent` library will be talking to it to register identities. There is UI that acts as a wallet where you can select existing identities
or create a new one.

### eventManager canister

`dfx deploy dfinity_js_backend` - deploys the eventManager canister where the business logic is implemented.
Basically, it implements functions like add, view, update, delete, and buy events + a set of helper functions.

Do not forget to run `dfx generate dfinity_js_backend` anytime you add/remove functions in the canister or when you change the signatures.
Otherwise, these changes won't be reflected in IDL's and won't work when called using the JS agent.

### eventManager frontend canister

`dfx deploy dfinity_js_frontend` - deployes the frontend app for the `dfinity_js_backend` canister on IC.
