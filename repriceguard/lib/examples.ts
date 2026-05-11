export const EXAMPLE_CONTRACTS: Record<string, { title: string; description: string; severity: string; source: string }> = {
  forwarder: {
    title: 'ETH Forwarder',
    description: 'Forwards ETH to recipients using hardcoded 21,000 gas — breaks under EIP-2780',
    severity: 'critical',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title ETHForwarder — VULNERABLE to EIP-2780
/// @notice Forwards ETH payments to downstream recipients
contract ETHForwarder {
    address public owner;
    mapping(address => uint256) public totalForwarded;

    event Forwarded(address indexed to, uint256 amount);

    constructor() {
        owner = msg.sender;
    }

    /// @dev CRITICAL: Hardcoded 21,000 gas cap
    /// Post EIP-2780: new account send costs 31,756 → this OOGs
    function forwardETH(address payable recipient) external payable {
        (bool ok,) = recipient.call{gas: 21000, value: msg.value}("");
        require(ok, "Forward failed");
        totalForwarded[recipient] += msg.value;
        emit Forwarded(recipient, msg.value);
    }

    /// @dev HIGH: .transfer() uses hardcoded 2,300 gas stipend
    /// EIP-7708 adds transfer log cost — may not fit in 2,300
    function withdrawToOwner() external {
        require(msg.sender == owner, "Not owner");
        payable(owner).transfer(address(this).balance);
    }

    /// @dev HIGH: .send() — same 2,300 stipend risk
    function trySend(address payable to, uint256 amount) external returns (bool) {
        return to.send(amount);
    }

    /// @dev CRITICAL: Old CALL_VALUE_COST hardcoded
    /// EIP-2780 changes this from 9,000 → 3,756
    function forwardWithOldSafeGas(address payable to) external payable {
        (bool ok,) = to.call{gas: 9000, value: msg.value}("");
        require(ok, "Failed");
    }

    receive() external payable {}
}`,
  },

  factory: {
    title: 'Clone Factory',
    description: 'Deploys minimal proxy clones — CREATE costs ~10× under EIP-8037',
    severity: 'critical',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title CloneFactory — VULNERABLE to EIP-8037
/// @notice Deploys EIP-1167 minimal proxy clones
contract CloneFactory {
    address public implementation;
    address[] public deployedClones;

    event CloneDeployed(address indexed clone, bytes32 salt);

    constructor(address _impl) {
        implementation = _impl;
    }

    /// @dev CRITICAL: EIP-8037 raises state_gas for CREATE ~10x
    /// Any external gas cap on this call will cause OOG post-Glamsterdam
    function deployClone(bytes32 salt) external returns (address clone) {
        address impl = implementation;
        assembly {
            let ptr := mload(0x40)
            mstore(ptr, 0x3d602d80600a3d3981f3363d3d373d3d3d363d73000000000000000000000000)
            mstore(add(ptr, 0x14), shl(0x60, impl))
            mstore(add(ptr, 0x28), 0x5af43d82803e903d91602b57fd5bf30000000000000000000000000000000000)
            clone := create2(0, ptr, 0x37, salt)
        }
        require(clone != address(0), "Clone deployment failed");
        deployedClones.push(clone);
        emit CloneDeployed(clone, salt);
    }

    /// @dev CRITICAL: Fixed gas cap — will OOG under EIP-8037's state_gas
    function deployWithBudget(bytes memory bytecode) external returns (address deployed) {
        uint256 deployGasBudget = 100000; // HARDCODED — too low post-EIP-8037
        assembly {
            deployed := create(0, add(bytecode, 32), mload(bytecode))
        }
        require(deployed != address(0), "Deployment failed");
    }

    /// @dev MEDIUM: gasleft() check based on old pre-EIP-8037 deployment cost
    function deployIfGasSufficient(bytes memory bytecode) external returns (address) {
        require(gasleft() > 150000, "Insufficient gas"); // outdated threshold
        address deployed;
        assembly {
            deployed := create(0, add(bytecode, 32), mload(bytecode))
        }
        return deployed;
    }
}`,
  },

  multisig: {
    title: 'Multisig Wallet',
    description: 'Uses .transfer() and fixed gas in execution — multiple EIP-2780 risks',
    severity: 'high',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title SimpleMultisig — Multiple Glamsterdam vulnerabilities
contract SimpleMultisig {
    address[] public owners;
    uint256 public required;
    mapping(bytes32 => uint256) public confirmations;
    mapping(bytes32 => mapping(address => bool)) public confirmed;

    event Execution(address indexed to, uint256 value);
    event ExecutionFailed(address indexed to, uint256 value);

    constructor(address[] memory _owners, uint256 _required) {
        owners = _owners;
        required = _required;
    }

    /// @dev HIGH: .transfer() uses 2,300 gas stipend
    /// EIP-7708 adds log cost — may break receive() with events
    function executeTransfer(address payable to, uint256 amount) external {
        to.transfer(amount);
        emit Execution(to, amount);
    }

    /// @dev CRITICAL: Hardcoded 21,000 gas for "safe" ETH execution
    /// Post EIP-2780: new-account sends cost 31,756 → OOG
    function executeCall(
        address payable to,
        uint256 value,
        bytes calldata data
    ) external {
        (bool ok,) = to.call{gas: 21000, value: value}(data);
        if (ok) emit Execution(to, value);
        else emit ExecutionFailed(to, value);
    }

    /// @dev HIGH: .send() — 2,300 stipend risk
    function tryTransfer(address payable to, uint256 amount) external returns (bool) {
        bool sent = to.send(amount);
        return sent;
    }

    /// @dev MEDIUM: Gas threshold based on old TX_BASE_COST = 21,000
    function isGasSufficient() public view returns (bool) {
        return gasleft() > 21000; // Should check against new 7,756 minimum
    }

    receive() external payable {}
}`,
  },

  defi: {
    title: 'DeFi Router',
    description: 'Gas estimation constants and forwarding logic need EIP-2780 update',
    severity: 'high',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title DeFiRouter — Gas model needs Glamsterdam update
/// @notice Aggregator routing swaps across multiple DEXes
interface IPool {
    function swap(address tokenIn, uint256 amountIn, address to) external returns (uint256);
}

contract DeFiRouter {
    // MEDIUM: BASE_GAS based on old TX_BASE_COST = 21,000
    // EIP-2780: new base is 4,500 for contract calls
    uint256 private constant BASE_GAS = 21000;
    uint256 private constant SWAP_GAS_OVERHEAD = 5000;

    address public owner;
    mapping(address => bool) public approvedPools;

    event SwapExecuted(address pool, uint256 amountIn, uint256 amountOut);

    constructor() { owner = msg.sender; }

    /// @dev MEDIUM: Gas estimate uses outdated BASE_GAS
    function estimateGas(uint256 executionGas) external pure returns (uint256) {
        return BASE_GAS + executionGas + SWAP_GAS_OVERHEAD;
        // Post EIP-2780: BASE_GAS should be 4,500 not 21,000
    }

    /// @dev CRITICAL: Hardcoded gas in value-forwarding call
    function executeTrade(
        address pool,
        bytes calldata swapData,
        uint256 value
    ) external payable {
        require(approvedPools[pool], "Pool not approved");
        // CRITICAL: 21,000 gas cap will OOG for new-account recipients
        (bool ok,) = pool.call{gas: 21000, value: value}(swapData);
        require(ok, "Swap failed");
    }

    /// @dev HIGH: .transfer() in reward distribution loop
    function distributeRewards(
        address[] calldata recipients,
        uint256[] calldata amounts
    ) external {
        for (uint256 i = 0; i < recipients.length; i++) {
            payable(recipients[i]).transfer(amounts[i]); // RISKY — 2300 stipend
        }
    }

    /// @dev MEDIUM: Cold SLOAD threshold uses pre-EIP-8038 cost
    function gasAwareFetch(uint256 slot) external view returns (uint256 val) {
        require(gasleft() > 2100, "Need cold SLOAD gas"); // EIP-8038: now 3,000
        assembly { val := sload(slot) }
    }

    receive() external payable {}
}`,
  },

  relayer: {
    title: 'Meta-Tx Relayer',
    description: 'Gas estimation built on TX_BASE_COST = 21,000 — needs EIP-2780 update',
    severity: 'medium',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

/// @title MetaTxRelayer — Gas model needs Glamsterdam update
/// @notice Executes meta-transactions on behalf of users
contract MetaTxRelayer {
    mapping(address => uint256) public nonces;
    address public operator;

    // MEDIUM: INTRINSIC_GAS based on old TX_BASE_COST
    // EIP-2780 drops this to 4,500 for contract calls
    uint256 private constant INTRINSIC_GAS = 21000;
    uint256 private constant EXECUTION_OVERHEAD = 5000;
    uint256 private constant REFUND_GAS = 2300; // HIGH: affected by EIP-7708

    event MetaTxExecuted(address indexed from, address indexed to, bool success);

    constructor() { operator = msg.sender; }

    function execute(
        address from,
        address to,
        uint256 value,
        bytes calldata data,
        uint8 v, bytes32 r, bytes32 s
    ) external returns (bool success) {
        uint256 gasStart = gasleft();

        // Execute the meta-transaction
        (success,) = to.call{value: value}(data);

        // MEDIUM: Gas refund calculation uses outdated INTRINSIC_GAS
        // After EIP-2780, overpays caller by ~16,500 gas worth of ETH
        uint256 gasUsed = gasStart - gasleft() + INTRINSIC_GAS;
        uint256 refund = gasUsed * tx.gasprice;

        // HIGH: .send() for refund — 2,300 stipend affected by EIP-7708
        payable(from).send(refund);

        emit MetaTxExecuted(from, to, success);
        nonces[from]++;
    }

    /// @dev Returns outdated minimum gas for a relay call
    function getMinRelayGas() public pure returns (uint256) {
        return INTRINSIC_GAS + EXECUTION_OVERHEAD;
        // Post EIP-2780: should return 4500 + EXECUTION_OVERHEAD = 9,500
    }

    receive() external payable {}
}`,
  },

  clean: {
    title: 'Clean ERC-20 (Baseline)',
    description: 'No hardcoded gas patterns — shows a passing scan result',
    severity: 'info',
    source: `// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title CleanToken — No Glamsterdam vulnerabilities
/// @notice Standard ERC-20 with no hardcoded gas values
/// @dev Safe to deploy post-Glamsterdam without gas-related changes
contract CleanToken {
    string  public name     = "Clean Token";
    string  public symbol   = "CLEAN";
    uint8   public decimals = 18;
    uint256 public totalSupply;

    mapping(address => uint256) public balanceOf;
    mapping(address => mapping(address => uint256)) public allowance;

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);

    error InsufficientBalance(uint256 have, uint256 need);
    error InsufficientAllowance(uint256 have, uint256 need);

    constructor(uint256 _supply) {
        totalSupply = _supply;
        balanceOf[msg.sender] = _supply;
        emit Transfer(address(0), msg.sender, _supply);
    }

    function transfer(address to, uint256 amount) external returns (bool) {
        if (balanceOf[msg.sender] < amount)
            revert InsufficientBalance(balanceOf[msg.sender], amount);
        balanceOf[msg.sender] -= amount;
        balanceOf[to] += amount;
        emit Transfer(msg.sender, to, amount);
        return true;
    }

    function approve(address spender, uint256 amount) external returns (bool) {
        allowance[msg.sender][spender] = amount;
        emit Approval(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) external returns (bool) {
        if (allowance[from][msg.sender] < amount)
            revert InsufficientAllowance(allowance[from][msg.sender], amount);
        if (balanceOf[from] < amount)
            revert InsufficientBalance(balanceOf[from], amount);
        allowance[from][msg.sender] -= amount;
        balanceOf[from] -= amount;
        balanceOf[to] += amount;
        emit Transfer(from, to, amount);
        return true;
    }

    // No ETH forwarding, no hardcoded gas, no .transfer()/.send()
    // Fully Glamsterdam-safe ✓
}`,
  },
};
