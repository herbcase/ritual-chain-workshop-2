// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

contract MockScheduler {
    uint256 public nextCallId;

    struct ScheduledCall {
        bytes data;
        uint32 gasLimit;
        uint32 startBlock;
        uint32 numCalls;
        uint32 frequency;
        uint32 ttl;
        uint256 maxFeePerGas;
        uint256 maxPriorityFeePerGas;
        uint256 value;
        address payer;
    }

    mapping(uint256 => ScheduledCall) public calls;
    mapping(address => bool) public approved;
    mapping(uint256 => bool) public canceled;

    function approveScheduler(address schedulerContract) external {
        approved[schedulerContract] = true;
    }

    function schedule(
        bytes calldata data,
        uint32 gasLimit,
        uint32 startBlock,
        uint32 numCalls,
        uint32 frequency,
        uint32 ttl,
        uint256 maxFeePerGas,
        uint256 maxPriorityFeePerGas,
        uint256 value,
        address payer
    ) external returns (uint256 callId) {
        callId = ++nextCallId;
        calls[callId] = ScheduledCall({
            data: data,
            gasLimit: gasLimit,
            startBlock: startBlock,
            numCalls: numCalls,
            frequency: frequency,
            ttl: ttl,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            value: value,
            payer: payer
        });
    }

    function cancel(uint256 callId) external {
        canceled[callId] = true;
    }

    function getCallState(uint256 callId) external view returns (uint8) {
        return canceled[callId] ? 2 : 1;
    }
}
