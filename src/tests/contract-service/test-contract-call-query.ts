import { assert, expect } from "chai";
import { ContractFunctionParameters } from "@hashgraph/sdk";
import { JSONRPCRequest } from "@services/Client";
import { setOperator } from "@helpers/setup-tests";
import { AbiCoder } from 'ethers';
import {
  generateEd25519PrivateKey,
  generateEd25519PublicKey,
} from "@helpers/key";
import { toHexString } from "@helpers/verify-contract-tx";

const abiCoder = AbiCoder.defaultAbiCoder();

// Bytecode for ContractCallQueryTest contract
const contractCallQueryBytecode =
  "608060405234801561000f575f5ffd5b5060405161283538038061283583398181016040528101906100319190610248565b805f908161003f919061049f565b50602a6001819055507fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff85600281905550600160035f6101000a81548160ff02191690831515021790555033600360016101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055506040516020016100d9906105c2565b60405160208183030381529060405280519060200120600481905550506105d6565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b61015a82610114565b810181811067ffffffffffffffff8211171561017957610178610124565b5b80604052505050565b5f61018b6100fb565b90506101978282610151565b919050565b5f67ffffffffffffffff8211156101b6576101b5610124565b5b6101bf82610114565b9050602081019050919050565b8281835e5f83830152505050565b5f6101ec6101e78461019c565b610182565b90508281526020810184848401111561020857610207610110565b5b6102138482856101cc565b509392505050565b5f82601f83011261022f5761022e61010c565b5b815161023f8482602086016101da565b91505092915050565b5f6020828403121561025d5761025c610104565b5b5f82015167ffffffffffffffff81111561027a57610279610108565b5b6102868482850161021b565b91505092915050565b5f81519050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f60028204905060018216806102dd57607f821691505b6020821081036102f0576102ef610299565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f600883026103527fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82610317565b61035c8683610317565b95508019841693508086168417925050509392505050565b5f819050919050565b5f819050919050565b5f6103a061039b61039684610374565b61037d565b610374565b9050919050565b5f819050919050565b6103b983610386565b6103cd6103c5826103a7565b848454610323565b825550505050565b5f5f905090565b6103e46103d5565b6103ef8184846103b0565b505050565b5b81811015610412576104075f826103dc565b6001810190506103f5565b5050565b601f82111561045757610428816102f6565b61043184610308565b81016020851015610440578190505b61045461044c85610308565b8301826103f4565b50505b505050565b5f82821c905092915050565b5f6104775f198460080261045c565b1980831691505092915050565b5f61048f8383610468565b9150826002028217905092915050565b6104a88261028f565b67ffffffffffffffff8111156104c1576104c0610124565b5b6104cb82546102c6565b6104d6828285610416565b5f60209050601f831160018114610507575f84156104f5578287015190505b6104ff8582610484565b865550610566565b601f198416610515866102f6565b5f5b8281101561053c57848901518255600182019150602085019450602081019050610517565b868310156105595784890151610555601f891682610468565b8355505b6001600288020188555050505b505050505050565b5f81905092915050565b7f74657374000000000000000000000000000000000000000000000000000000005f82015250565b5f6105ac60048361056e565b91506105b782610578565b600482019050919050565b5f6105cc826105a0565b9150819050919050565b612252806105e35f395ff3fe608060405260043610610287575f3560e01c80637a36b3ee11610159578063b0ef42ba116100c0578063d1f300ed11610079578063d1f300ed14610922578063d478b9eb1461094c578063d646172314610976578063e21f37ce146109a0578063ef9fc50b146109ca578063f5b53e1714610a0657610287565b8063b0ef42ba14610830578063c3334ff81461085c578063c3f28fe214610886578063ce6d41de146108b0578063cefe1833146108da578063d0e30db01461090457610287565b80639fb37853116101125780639fb37853146107485780639fecdc5a1461075e578063a008416d14610788578063a5b0930d146107b2578063a7083cde146107dc578063a922faa11461080657610287565b80637a36b3ee1461063c5780638674e248146106785780638f63640e146106a2578063930c8a44146106cc57806396c20a3c146106f45780639a0363bb1461071e57610287565b806342948e18116101fd57806359baa911116101b657806359baa911146105515780635c116b801461057b578063649c20e3146105a5578063650543a3146105cf57806368895979146105fc5780636c8893d31461062657610287565b806342948e181461044357806350424ec21461046d57806354e17632146104a957806356e1b15c146104d357806357cb2fc4146104fd57806357f28bed1461052757610287565b806320dfd7d81161024f57806320dfd7d81461035d5780632f576f2014610387578063343a875d1461039d578063368b8772146103c757806338cc4831146103ef5780634264b1f91461041957610287565b80630d19ede01461028b5780630debae67146102b557806312065fe0146102df57806312a7b914146103095780631f90303714610333575b5f5ffd5b348015610296575f5ffd5b5061029f610a30565b6040516102ac91906112db565b60405180910390f35b3480156102c0575f5ffd5b506102c9610a36565b6040516102d6919061130f565b60405180910390f35b3480156102ea575f5ffd5b506102f3610a5d565b60405161030091906112db565b60405180910390f35b348015610314575f5ffd5b5061031d610a64565b60405161032a9190611342565b60405180910390f35b34801561033e575f5ffd5b50610347610a79565b6040516103549190611373565b60405180910390f35b348015610368575f5ffd5b50610371610a82565b60405161037e9190611443565b60405180910390f35b348015610392575f5ffd5b5061039b610b3d565b005b3480156103a8575f5ffd5b506103b1610b3f565b6040516103be919061147e565b60405180910390f35b3480156103d2575f5ffd5b506103ed60048036038101906103e891906115e4565b610b47565b005b3480156103fa575f5ffd5b50610403610ba7565b604051610410919061166a565b60405180910390f35b348015610424575f5ffd5b5061042d610bd0565b60405161043a919061169e565b60405180910390f35b34801561044e575f5ffd5b50610457610bf7565b604051610464919061166a565b60405180910390f35b348015610478575f5ffd5b50610493600480360381019061048e91906116e1565b610bfe565b6040516104a091906112db565b60405180910390f35b3480156104b4575f5ffd5b506104bd610c5e565b6040516104ca919061172a565b60405180910390f35b3480156104de575f5ffd5b506104e7610c69565b6040516104f49190611765565b60405180910390f35b348015610508575f5ffd5b50610511610c78565b60405161051e9190611798565b60405180910390f35b348015610532575f5ffd5b5061053b610c9f565b6040516105489190611342565b60405180910390f35b34801561055c575f5ffd5b50610565610ca6565b60405161057291906117d1565b60405180910390f35b348015610586575f5ffd5b5061058f610cb3565b60405161059c9190611809565b60405180910390f35b3480156105b0575f5ffd5b506105b9610cbf565b6040516105c6919061183d565b60405180910390f35b3480156105da575f5ffd5b506105e3610ce6565b6040516105f394939291906118b6565b60405180910390f35b348015610607575f5ffd5b50610610610db9565b60405161061d91906112db565b60405180910390f35b348015610631575f5ffd5b5061063a610dc2565b005b348015610647575f5ffd5b50610662600480360381019061065d9190611900565b610e49565b60405161066f9190611976565b60405180910390f35b348015610683575f5ffd5b5061068c610e75565b6040516106999190611342565b60405180910390f35b3480156106ad575f5ffd5b506106b6610e7d565b6040516106c3919061166a565b60405180910390f35b3480156106d7575f5ffd5b506106f260048036038101906106ed91906115e4565b610ea3565b005b3480156106ff575f5ffd5b50610708610ee0565b60405161071591906119b1565b60405180910390f35b348015610729575f5ffd5b50610732610f07565b60405161073f9190611373565b60405180910390f35b348015610753575f5ffd5b5061075c610f0d565b005b348015610769575f5ffd5b50610772610f48565b60405161077f91906119e7565b60405180910390f35b348015610793575f5ffd5b5061079c610f52565b6040516107a99190611a1b565b60405180910390f35b3480156107bd575f5ffd5b506107c6610f79565b6040516107d39190611aeb565b60405180910390f35b3480156107e7575f5ffd5b506107f061106e565b6040516107fd9190611b23565b60405180910390f35b348015610811575f5ffd5b5061081a611074565b6040516108279190611b5d565b60405180910390f35b34801561083b575f5ffd5b50610844611082565b60405161085393929190611b76565b60405180910390f35b348015610867575f5ffd5b506108706110b5565b60405161087d9190611bc7565b60405180910390f35b348015610891575f5ffd5b5061089a6110be565b6040516108a79190611bfb565b60405180910390f35b3480156108bb575f5ffd5b506108c46110e5565b6040516108d19190611976565b60405180910390f35b3480156108e5575f5ffd5b506108ee611174565b6040516108fb9190611342565b60405180910390f35b61090c611186565b60405161091991906112db565b60405180910390f35b34801561092d575f5ffd5b5061093661118d565b6040516109439190611c66565b60405180910390f35b348015610957575f5ffd5b506109606111ca565b60405161096d9190611ca1565b60405180910390f35b348015610981575f5ffd5b5061098a6111f1565b6040516109979190611373565b60405180910390f35b3480156109ab575f5ffd5b506109b461121a565b6040516109c19190611976565b60405180910390f35b3480156109d5575f5ffd5b506109f060048036038101906109eb9190611cba565b6112a5565b6040516109fd91906112db565b60405180910390f35b348015610a11575f5ffd5b50610a1a6112ba565b604051610a279190611b23565b60405180910390f35b60015481565b5f7fffffffffffffffffffffffffffffffffffffffffffffffff8000000000000001905090565b5f47905090565b5f60035f9054906101000a900460ff16905090565b5f600454905090565b60605f600367ffffffffffffffff811115610aa057610a9f6114c0565b5b604051908082528060200260200182016040528015610ace5781602001602082028036833780820191505090505b5090506001815f81518110610ae657610ae5611cf8565b5b602002602001018181525050600281600181518110610b0857610b07611cf8565b5b602002602001018181525050600381600281518110610b2a57610b29611cf8565b5b6020026020010181815250508091505090565b565b5f60ff905090565b805f9081610b559190611f22565b503373ffffffffffffffffffffffffffffffffffffffff167f209e49e079e80a178a2da3cd923b743aea3dc2cd98d1b27a281ed2d86c44b38782604051610b9c9190611976565b60405180910390a250565b5f600360019054906101000a900473ffffffffffffffffffffffffffffffffffffffff16905090565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffff800001905090565b5f33905090565b5f5f8290505f5f90505b6064811015610c54576001600283610c20919061201e565b610c2a919061205f565b9150620f4240821115610c4757600282610c4491906120bf565b91505b8080600101915050610c08565b5080915050919050565b5f63ffffffff905090565b5f67ffffffffffffffff905090565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffd6905090565b5f5f905090565b5f65ffffffffffff905090565b5f64ffffffffff905090565b5f7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffc18905090565b60605f5f5f5f60015460035f9054906101000a900460ff16600360019054906101000a900473ffffffffffffffffffffffffffffffffffffffff16838054610d2d90611d52565b80601f0160208091040260200160405190810160405280929190818152602001828054610d5990611d52565b8015610da45780601f10610d7b57610100808354040283529160200191610da4565b820191905f5260205f20905b815481529060010190602001808311610d8757829003601f168201915b50505050509350935093509350935090919293565b5f600154905090565b3373ffffffffffffffffffffffffffffffffffffffff167f209e49e079e80a178a2da3cd923b743aea3dc2cd98d1b27a281ed2d86c44b387604051610e0690612139565b60405180910390a27f9ec8254969d1974eac8c74afb0c03595b4ffe0a1d7ad8a7f82ed31b9c8542591600154604051610e3f91906112db565b60405180910390a1565b60608282604051602001610e5e929190612191565b604051602081830303815290604052905092915050565b5f6001905090565b600360019054906101000a900473ffffffffffffffffffffffffffffffffffffffff1681565b806040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610ed79190611976565b60405180910390fd5b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffffff8000000001905090565b60045481565b6040517f08c379a0000000000000000000000000000000000000000000000000000000008152600401610f3f906121fe565b60405180910390fd5b5f62ffffff905090565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffffff800000000001905090565b60605f600267ffffffffffffffff811115610f9757610f966114c0565b5b604051908082528060200260200182016040528015610fc55781602001602082028036833780820191505090505b5090506001815f81518110610fdd57610fdc611cf8565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff168152505060028160018151811061102d5761102c611cf8565b5b602002602001019073ffffffffffffffffffffffffffffffffffffffff16908173ffffffffffffffffffffffffffffffffffffffff16815250508091505090565b60025481565b5f66ffffffffffffff905090565b5f5f5f60647fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffce6019925092509250909192565b5f61ffff905090565b5f7fffffffffffffffffffffffffffffffffffffffffffffffffff80000000000001905090565b60605f80546110f390611d52565b80601f016020809104026020016040519081016040528092919081815260200182805461111f90611d52565b801561116a5780601f106111415761010080835404028352916020019161116a565b820191905f5260205f20905b81548152906001019060200180831161114d57829003601f168201915b5050505050905090565b60035f9054906101000a900460ff1681565b5f34905090565b60606040518060400160405280600481526020017fdeadbeef00000000000000000000000000000000000000000000000000000000815250905090565b5f7ffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffe7960905090565b5f7f1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef5f1b905090565b5f805461122690611d52565b80601f016020809104026020016040519081016040528092919081815260200182805461125290611d52565b801561129d5780601f106112745761010080835404028352916020019161129d565b820191905f5260205f20905b81548152906001019060200180831161128057829003601f168201915b505050505081565b5f81836112b2919061205f565b905092915050565b5f600254905090565b5f819050919050565b6112d5816112c3565b82525050565b5f6020820190506112ee5f8301846112cc565b92915050565b5f8160070b9050919050565b611309816112f4565b82525050565b5f6020820190506113225f830184611300565b92915050565b5f8115159050919050565b61133c81611328565b82525050565b5f6020820190506113555f830184611333565b92915050565b5f819050919050565b61136d8161135b565b82525050565b5f6020820190506113865f830184611364565b92915050565b5f81519050919050565b5f82825260208201905092915050565b5f819050602082019050919050565b6113be816112c3565b82525050565b5f6113cf83836113b5565b60208301905092915050565b5f602082019050919050565b5f6113f18261138c565b6113fb8185611396565b9350611406836113a6565b805f5b8381101561143657815161141d88826113c4565b9750611428836113db565b925050600181019050611409565b5085935050505092915050565b5f6020820190508181035f83015261145b81846113e7565b905092915050565b5f60ff82169050919050565b61147881611463565b82525050565b5f6020820190506114915f83018461146f565b92915050565b5f604051905090565b5f5ffd5b5f5ffd5b5f5ffd5b5f5ffd5b5f601f19601f8301169050919050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52604160045260245ffd5b6114f6826114b0565b810181811067ffffffffffffffff82111715611515576115146114c0565b5b80604052505050565b5f611527611497565b905061153382826114ed565b919050565b5f67ffffffffffffffff821115611552576115516114c0565b5b61155b826114b0565b9050602081019050919050565b828183375f83830152505050565b5f61158861158384611538565b61151e565b9050828152602081018484840111156115a4576115a36114ac565b5b6115af848285611568565b509392505050565b5f82601f8301126115cb576115ca6114a8565b5b81356115db848260208601611576565b91505092915050565b5f602082840312156115f9576115f86114a0565b5b5f82013567ffffffffffffffff811115611616576116156114a4565b5b611622848285016115b7565b91505092915050565b5f73ffffffffffffffffffffffffffffffffffffffff82169050919050565b5f6116548261162b565b9050919050565b6116648161164a565b82525050565b5f60208201905061167d5f83018461165b565b92915050565b5f8160020b9050919050565b61169881611683565b82525050565b5f6020820190506116b15f83018461168f565b92915050565b6116c0816112c3565b81146116ca575f5ffd5b50565b5f813590506116db816116b7565b92915050565b5f602082840312156116f6576116f56114a0565b5b5f611703848285016116cd565b91505092915050565b5f63ffffffff82169050919050565b6117248161170c565b82525050565b5f60208201905061173d5f83018461171b565b92915050565b5f67ffffffffffffffff82169050919050565b61175f81611743565b82525050565b5f6020820190506117785f830184611756565b92915050565b5f815f0b9050919050565b6117928161177e565b82525050565b5f6020820190506117ab5f830184611789565b92915050565b5f65ffffffffffff82169050919050565b6117cb816117b1565b82525050565b5f6020820190506117e45f8301846117c2565b92915050565b5f64ffffffffff82169050919050565b611803816117ea565b82525050565b5f60208201905061181c5f8301846117fa565b92915050565b5f8160010b9050919050565b61183781611822565b82525050565b5f6020820190506118505f83018461182e565b92915050565b5f81519050919050565b5f82825260208201905092915050565b8281835e5f83830152505050565b5f61188882611856565b6118928185611860565b93506118a2818560208601611870565b6118ab816114b0565b840191505092915050565b5f6080820190508181035f8301526118ce818761187e565b90506118dd60208301866112cc565b6118ea6040830185611333565b6118f7606083018461165b565b95945050505050565b5f5f60408385031215611916576119156114a0565b5b5f83013567ffffffffffffffff811115611933576119326114a4565b5b61193f858286016115b7565b925050602083013567ffffffffffffffff8111156119605761195f6114a4565b5b61196c858286016115b7565b9150509250929050565b5f6020820190508181035f83015261198e818461187e565b905092915050565b5f8160040b9050919050565b6119ab81611996565b82525050565b5f6020820190506119c45f8301846119a2565b92915050565b5f62ffffff82169050919050565b6119e1816119ca565b82525050565b5f6020820190506119fa5f8301846119d8565b92915050565b5f8160050b9050919050565b611a1581611a00565b82525050565b5f602082019050611a2e5f830184611a0c565b92915050565b5f81519050919050565b5f82825260208201905092915050565b5f819050602082019050919050565b611a668161164a565b82525050565b5f611a778383611a5d565b60208301905092915050565b5f602082019050919050565b5f611a9982611a34565b611aa38185611a3e565b9350611aae83611a4e565b805f5b83811015611ade578151611ac58882611a6c565b9750611ad083611a83565b925050600181019050611ab1565b5085935050505092915050565b5f6020820190508181035f830152611b038184611a8f565b905092915050565b5f819050919050565b611b1d81611b0b565b82525050565b5f602082019050611b365f830184611b14565b92915050565b5f66ffffffffffffff82169050919050565b611b5781611b3c565b82525050565b5f602082019050611b705f830184611b4e565b92915050565b5f606082019050611b895f8301866112cc565b611b966020830185611b14565b611ba3604083018461146f565b949350505050565b5f61ffff82169050919050565b611bc181611bab565b82525050565b5f602082019050611bda5f830184611bb8565b92915050565b5f8160060b9050919050565b611bf581611be0565b82525050565b5f602082019050611c0e5f830184611bec565b92915050565b5f81519050919050565b5f82825260208201905092915050565b5f611c3882611c14565b611c428185611c1e565b9350611c52818560208601611870565b611c5b816114b0565b840191505092915050565b5f6020820190508181035f830152611c7e8184611c2e565b905092915050565b5f8160030b9050919050565b611c9b81611c86565b82525050565b5f602082019050611cb45f830184611c92565b92915050565b5f5f60408385031215611cd057611ccf6114a0565b5b5f611cdd858286016116cd565b9250506020611cee858286016116cd565b9150509250929050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52603260045260245ffd5b7f4e487b71000000000000000000000000000000000000000000000000000000005f52602260045260245ffd5b5f6002820490506001821680611d6957607f821691505b602082108103611d7c57611d7b611d25565b5b50919050565b5f819050815f5260205f209050919050565b5f6020601f8301049050919050565b5f82821b905092915050565b5f60088302611dde7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff82611da3565b611de88683611da3565b95508019841693508086168417925050509392505050565b5f819050919050565b5f611e23611e1e611e19846112c3565b611e00565b6112c3565b9050919050565b5f819050919050565b611e3c83611e09565b611e50611e4882611e2a565b848454611daf565b825550505050565b5f5f905090565b611e67611e58565b611e72818484611e33565b505050565b5b81811015611e9557611e8a5f82611e5f565b600181019050611e78565b5050565b601f821115611eda57611eab81611d82565b611eb484611d94565b81016020851015611ec3578190505b611ed7611ecf85611d94565b830182611e77565b50505b505050565b5f82821c905092915050565b5f611efa5f1984600802611edf565b1980831691505092915050565b5f611f128383611eeb565b9150826002028217905092915050565b611f2b82611856565b67ffffffffffffffff811115611f4457611f436114c0565b5b611f4e8254611d52565b611f59828285611e99565b5f60209050601f831160018114611f8a575f8415611f78578287015190505b611f828582611f07565b865550611fe9565b601f198416611f9886611d82565b5f5b82811015611fbf57848901518255600182019150602085019450602081019050611f9a565b86831015611fdc5784890151611fd8601f891682611eeb565b8355505b6001600288020188555050505b505050505050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601160045260245ffd5b5f612028826112c3565b9150612033836112c3565b9250828202612041816112c3565b9150828204841483151761205857612057611ff1565b5b5092915050565b5f612069826112c3565b9150612074836112c3565b925082820190508082111561208c5761208b611ff1565b5b92915050565b7f4e487b71000000000000000000000000000000000000000000000000000000005f52601260045260245ffd5b5f6120c9826112c3565b91506120d4836112c3565b9250826120e4576120e3612092565b5b828204905092915050565b7f4576656e74206d657373616765000000000000000000000000000000000000005f82015250565b5f612123600d83611860565b915061212e826120ef565b602082019050919050565b5f6020820190508181035f83015261215081612117565b9050919050565b5f81905092915050565b5f61216b82611856565b6121758185612157565b9350612185818560208601611870565b80840191505092915050565b5f61219c8285612161565b91506121a88284612161565b91508190509392505050565b7f546869732066756e6374696f6e20616c776179732072657665727473000000005f82015250565b5f6121e8601c83611860565b91506121f3826121b4565b602082019050919050565b5f6020820190508181035f830152612215816121dc565b905091905056fea264697066735822122070934dac488f04238892853abb82a47c9870183504ee0cda1c0884fecfe33b3864736f6c634300081e0033";

/**
 * Helper function to create a contract for testing
 */
async function createTestContract(
  context: any,
  constructorMessage: string,
  privateKey?: string,
): Promise<string> {
  const ed25519PrivateKey = privateKey
    ? privateKey
    : await generateEd25519PrivateKey(context);
  const ed25519PublicKey = await generateEd25519PublicKey(
    context,
    ed25519PrivateKey,
  );

  const fileResponse = await JSONRPCRequest(context, "createFile", {
    keys: [ed25519PublicKey],
    contents: "",
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });

  await JSONRPCRequest(context, "appendFile", {
    keys: [ed25519PublicKey],
    fileId: fileResponse.fileId,
    contents: contractCallQueryBytecode,
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });
  const fileId = fileResponse.fileId;

  const constructorParams = new ContractFunctionParameters()
    .addString(constructorMessage)
    ._build();

  const response = await JSONRPCRequest(context, "createContract", {
    bytecodeFileId: fileId,
    gas: "3000000",
    adminKey: ed25519PublicKey,
    constructorParameters: toHexString(constructorParams),
    commonTransactionParams: {
      signers: [ed25519PrivateKey],
    },
  });

  return response.contractId;
}

/**
 * Helper function to perform a contract call query
 */
async function performContractCallQuery(
  context: any,
  contractId: string,
  functionName: string,
  functionParams?: Uint8Array,
  gas: string = "75000",
): Promise<any> {
  const params: any = {
    contractId,
    gas,
  };

  if (functionParams) {
    params.functionParameters = toHexString(functionParams);
  } else {
    params.functionName = functionName;
  }

  return await JSONRPCRequest(context, "contractCallQuery", params);
}

/**
 * Tests for ContractCallQuery
 */
describe("ContractCallQuery", function () {
  this.timeout(30000);

  before(async function () {
    await setOperator(
      this,
      process.env.OPERATOR_ACCOUNT_ID as string,
      process.env.OPERATOR_ACCOUNT_PRIVATE_KEY as string,
    );
  });

  after(async function () {
    await JSONRPCRequest(this, "reset", {
      sessionId: this.sessionId,
    });
  });

  describe("Contract ID", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Hello from Hedera");
    });

    it("(#1) Executes a contract call query with valid contract ID", async function () {
      const functionParams = new ContractFunctionParameters()._build(
        "getMessage",
      );

      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        functionParams,
      );

      expect(response).to.not.be.null;
      expect(response.rawResult).to.not.be.null;
    });

    it("(#2) Fails to execute contract call query without contract ID", async function () {
      try {
        await JSONRPCRequest(this, "contractCallQuery", {
          gas: "75000",
          functionName: "getMessage",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CONTRACT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Fails to execute contract call query with non-existent contract ID", async function () {
      try {
        await performContractCallQuery(
          this,
          "123.456.789",
          "getMessage",
          new ContractFunctionParameters()._build("getMessage"),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INVALID_CONTRACT_ID");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Gas", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Test Message");
    });

    it("(#1) Executes contract call query with valid gas amount", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
        "100000",
      );

      expect(response).to.not.be.null;
      expect(response.gasUsed).to.not.be.null;
      expect(parseInt(response.gasUsed)).to.be.lessThan(100000);
    });

    it("(#2) Fails to execute contract call query without gas", async function () {
      try {
        await JSONRPCRequest(this, "contractCallQuery", {
          contractId,
          functionName: "getMessage",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "INSUFFICIENT_GAS");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Fails to execute contract call query with insufficient gas", async function () {
      try {
        await performContractCallQuery(
          this,
          contractId,
          "complexCalculation",
          new ContractFunctionParameters()
            .addUint256(999999)
            ._build("complexCalculation"),
          "100", // Very low gas
        );
      } catch (err: any) {
        assert.equal(err.data.status, "INSUFFICIENT_GAS");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#4) Executes contract call query with maximum gas", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
        "1000000",
      );

      expect(response).to.not.be.null;
      expect(response.gasUsed).to.not.be.null;
    });
  });

  describe("Function Parameters", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Initial Message");
    });

    it("(#1) Executes query with no parameters for parameter-less function", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
      );

      expect(response).to.not.be.null;
      expect(response.rawResult).to.not.be.null;
    });

    it("(#2) Executes query with uint256 parameter", async function () {
      const functionParams = new ContractFunctionParameters()
        .addUint256(100)
        .addUint256(200)
        ._build("addNumbers");

      const response = await performContractCallQuery(
        this,
        contractId,
        "addNumbers",
        functionParams,
      );


      const result = abiCoder.decode(['uint256'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
      expect(result.toString()).to.equal("300");
    });

    it("(#3) Executes query with string parameter", async function () {
      const functionParams = new ContractFunctionParameters()
        .addString("Hello")
        .addString(" World")
        ._build("concatenateStrings");

      const response = await performContractCallQuery(
        this,
        contractId,
        "concatenateStrings",
        functionParams,
      );

      expect(response).to.not.be.null;
    });

    it("(#4) Executes query with multiple parameters", async function () {
      const functionParams = new ContractFunctionParameters()
        .addUint256(100)
        .addUint256(200)
        ._build("addNumbers");

      const response = await performContractCallQuery(
        this,
        contractId,
        "addNumbers",
        functionParams,
      );

      expect(response).to.not.be.null;
    });

    it("(#5) Fails when function name is not set", async function () {
      try {
        await JSONRPCRequest(this, "contractCallQuery", {
          contractId,
          gas: "75000",
        });
      } catch (err: any) {
        assert.equal(err.data.status, "CONTRACT_REVERT_EXECUTED");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Return Value Types - Strings", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Hello from Hedera");
    });

    it("(#1) Returns string value correctly", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
      );

     const result = abiCoder.decode(['string'], `0x${response.rawResult}`)[0];
     expect(result).to.equal("Hello from Hedera");
    });

    it("(#2) Returns concatenated string value", async function () {
      const functionParams = new ContractFunctionParameters()
        .addString("Hello")
        .addString(" World")
        ._build("concatenateStrings");

      const response = await performContractCallQuery(
        this,
        contractId,
        "concatenateStrings",
        functionParams,
      );

      const result = abiCoder.decode(['string'], `0x${response.rawResult}`)[0];
      expect(result).to.equal("Hello World");
    });

    it("(#3) Returns empty string when expected", async function () {
      const emptyContractId = await createTestContract(this, "");

      const response = await performContractCallQuery(
        this,
        emptyContractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
      );

      const result = abiCoder.decode(['string'], `0x${response.rawResult}`)[0];
      expect(result).to.equal("");
    });
  });

  describe("Return Value Types - Boolean", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Test");
    });

    it("(#1) Returns true boolean value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getTrue",
        new ContractFunctionParameters()._build("getTrue"),
      );

      const result = abiCoder.decode(['bool'], `0x${response.rawResult}`)[0];
      expect(result).to.equal(true);
    });

    it("(#2) Returns false boolean value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getFalse",
        new ContractFunctionParameters()._build("getFalse"),
      );

      const result = abiCoder.decode(['bool'], `0x${response.rawResult}`)[0];
      expect(result).to.equal(false);
    });

    it("(#3) Returns stored boolean value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getBool",
        new ContractFunctionParameters()._build("getBool"),
      );

      const result = abiCoder.decode(['bool'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
      expect(typeof result).to.equal("boolean");
    });
  });

  describe("Return Value Types - Integers", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Test");
    });

    it("(#1) Returns int8 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt8",
        new ContractFunctionParameters()._build("getInt8"),
      );

      const result = abiCoder.decode(['int8'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#2) Returns uint8 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint8",
        new ContractFunctionParameters()._build("getUint8"),
      );

      const result = abiCoder.decode(['uint8'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#3) Returns int16 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt16",
        new ContractFunctionParameters()._build("getInt16"),
      );

      const result = abiCoder.decode(['int16'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#4) Returns uint16 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint16",
        new ContractFunctionParameters()._build("getUint16"),
      );

      const result = abiCoder.decode(['uint16'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#5) Returns int32 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt32",
        new ContractFunctionParameters()._build("getInt32"),
      );

      const result = abiCoder.decode(['int32'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#6) Returns uint32 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint32",
        new ContractFunctionParameters()._build("getUint32"),
      );

      const result = abiCoder.decode(['uint32'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#7) Returns int64 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt64",
        new ContractFunctionParameters()._build("getInt64"),
      );

      const result = abiCoder.decode(['int64'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#8) Returns uint64 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint64",
        new ContractFunctionParameters()._build("getUint64"),
      );

      const result = abiCoder.decode(['uint64'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#9) Returns int256 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt256",
        new ContractFunctionParameters()._build("getInt256"),
      );

       const result = abiCoder.decode(['int256'], `0x${response.rawResult}`)[0];
       expect(result).to.not.be.null;
    });

    it("(#10) Returns uint256 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint256",
        new ContractFunctionParameters()._build("getUint256"),
      );

      const result = abiCoder.decode(['uint256'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#11) Returns result from calculation with uint256", async function () {
      const functionParams = new ContractFunctionParameters()
        .addUint256(100)
        .addUint256(200)
        ._build("addNumbers");

      const response = await performContractCallQuery(
        this,
        contractId,
        "addNumbers",
        functionParams,
      );

      const result = abiCoder.decode(['uint256'], `0x${response.rawResult}`)[0];
      expect(result.toString()).to.equal("300");
    });

    it("(#12) Returns int24 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt24",
        new ContractFunctionParameters()._build("getInt24"),
      );

      const result = abiCoder.decode(['int24'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#13) Returns uint24 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint24",
        new ContractFunctionParameters()._build("getUint24"),
      );

      const result = abiCoder.decode(['uint24'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#14) Returns int40 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt40",
        new ContractFunctionParameters()._build("getInt40"),
      );

      const result = abiCoder.decode(['int40'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#15) Returns uint40 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint40",
        new ContractFunctionParameters()._build("getUint40"),
      );

      const result = abiCoder.decode(['uint40'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#16) Returns int48 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt48",
        new ContractFunctionParameters()._build("getInt48"),
      );

      const result = abiCoder.decode(['int48'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#17) Returns uint48 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint48",
        new ContractFunctionParameters()._build("getUint48"),
      );

      const result = abiCoder.decode(['uint48'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#18) Returns int56 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getInt56",
        new ContractFunctionParameters()._build("getInt56"),
      );

      const result = abiCoder.decode(['int56'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#19) Returns uint56 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint56",
        new ContractFunctionParameters()._build("getUint56"),
      );

      const result = abiCoder.decode(['uint56'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });
  });

  describe("Return Value Types - Address", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Test");
    });

    it("(#1) Returns address value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getAddress",
        new ContractFunctionParameters()._build("getAddress"),
      );

      const result = abiCoder.decode(['address'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
      expect(result).to.match(/^0x[a-fA-F0-9]{40}$/);
    });

    it("(#2) Returns sender address", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getSenderAddress",
        new ContractFunctionParameters()._build("getSenderAddress"),
      );

      const result = abiCoder.decode(['address'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
      expect(result).to.match(/^0x[a-fA-F0-9]{40}$/);
    });
  });

  describe("Return Value Types - Bytes", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Test");
    });

    it("(#1) Returns bytes32 value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getBytes32",
        new ContractFunctionParameters()._build("getBytes32"),
      );

      const result = abiCoder.decode(['bytes32'], `0x${response.rawResult}`)[0];
      expect(result).to.not.be.null;
    });

    it("(#2) Returns fixed bytes value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getFixedBytes",
        new ContractFunctionParameters()._build("getFixedBytes"),
      );

      expect(response.rawResult).to.not.be.null;
    });

    it("(#3) Returns dynamic bytes value", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getDynamicBytes",
        new ContractFunctionParameters()._build("getDynamicBytes"),
      );

      expect(response.rawResult).to.not.be.null;
    });
  });

  describe("Return Value Types - Arrays", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Test");
    });

    it("(#1) Returns uint256 array", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint256Array",
        new ContractFunctionParameters()._build("getUint256Array"),
      );

      const result = abiCoder.decode(['uint256[]'], `0x${response.rawResult}`)[0];
      expect(response).to.not.be.null;
      expect(result).to.not.be.null;
    });

    it("(#2) Returns address array", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getAddressArray",
        new ContractFunctionParameters()._build("getAddressArray"),
      );


      const result = abiCoder.decode(['address[]'], `0x${response.rawResult}`)[0];
      expect(response).to.not.be.null;
      expect(result).to.not.be.null;
    });
  });

  describe("Return Value Types - Multiple Values", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Multiple Values Test");
    });

    it("(#1) Returns multiple values from function", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMultipleValues",
        new ContractFunctionParameters()._build("getMultipleValues"),
      );

      expect(response).to.not.be.null;
      expect(response.rawResult).to.not.be.null;
    });

    it("(#2) Returns multiple integer values", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMultipleIntegers",
        new ContractFunctionParameters()._build("getMultipleIntegers"),
      );

      expect(response).to.not.be.null;
      expect(response.rawResult).to.not.be.null;
    });
  });

  describe("Gas Usage", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Gas Test");
    });

    it("(#1) Returns gas used for simple query", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
      );

      expect(response.gasUsed).to.not.be.null;
      expect(parseInt(response.gasUsed)).to.be.greaterThan(0);
    });

    it("(#2) Gas used is less than or equal to gas provided", async function () {
      const gasProvided = "100000";
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
        gasProvided,
      );

      expect(parseInt(response.gasUsed)).to.be.lessThanOrEqual(
        parseInt(gasProvided),
      );
    });
  });

  describe("Error Handling", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Error Test");
    });

    it("(#1) Returns error when function reverts", async function () {
      try {
        await performContractCallQuery(
          this,
          contractId,
          "alwaysRevert",
          new ContractFunctionParameters()._build("alwaysRevert"),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "CONTRACT_REVERT_EXECUTED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#2) Returns error when function reverts with custom message", async function () {
      try {
        await performContractCallQuery(
          this,
          contractId,
          "revertWithCustomMessage",
          new ContractFunctionParameters()
            .addString("Custom error message")
            ._build("revertWithCustomMessage"),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "CONTRACT_REVERT_EXECUTED");
        return;
      }
      assert.fail("Should throw an error");
    });

    it("(#3) Returns error when calling non-existent function", async function () {
      try {
        await performContractCallQuery(
          this,
          contractId,
          "nonExistentFunction",
          new ContractFunctionParameters()._build("nonExistentFunction"),
        );
      } catch (err: any) {
        assert.equal(err.data.status, "CONTRACT_REVERT_EXECUTED");
        return;
      }
      assert.fail("Should throw an error");
    });
  });

  describe("Query Cost and Payment", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Payment Test");
    });

    it.skip("(#1) Executes query with explicit payment amount", async function () {
      const response = await JSONRPCRequest(this, "contractCallQuery", {
        contractId,
        gas: "75000",
        functionName: "getMessage",
        maxQueryPayment: "100000000", // 1 HBAR in tinybars
      });

      expect(response).to.not.be.null;
    });

    it("(#2) Executes query and retrieves cost", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
      );

      expect(response).to.not.be.null;
      // Cost information should be available in response metadata
    });
  });

  describe("Sender Account ID", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Sender Test");
    });

    it.skip("(#1) Executes query with explicit sender account ID", async function () {
      const response = await JSONRPCRequest(this, "contractCallQuery", {
        contractId,
        gas: "75000",
        functionName: "getSenderAddress",
        senderAccountId: process.env.OPERATOR_ACCOUNT_ID as string,
      });

      expect(response).to.not.be.null;
      expect(response.address).to.not.be.null;
    });

    it("(#2) Executes query without explicit sender account ID", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getSenderAddress",
        new ContractFunctionParameters()._build("getSenderAddress"),
      );

      expect(response).to.not.be.null;
      expect(response.address).to.not.be.null;
    });
  });

  describe("Contract ID Field", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Field Test");
    });

    it("(#1) Response contains contract ID", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
      );

      expect(response.contractId).to.equal(contractId);
    });
  });

  describe("Bytes Field", function () {
    let contractId: string;

    before(async function () {
      contractId = await createTestContract(this, "Bytes Test");
    });

    it("(#1) Response contains bytes field", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getMessage",
        new ContractFunctionParameters()._build("getMessage"),
      );

      expect(response.rawResult).to.not.be.null;
      expect(response.rawResult).to.be.a("string");
    });

    it("(#2) Bytes field contains valid hex data", async function () {
      const response = await performContractCallQuery(
        this,
        contractId,
        "getUint256",
        new ContractFunctionParameters()._build("getUint256"),
      );

      const result = abiCoder.decode(['uint256'], `0x${response.rawResult}`)[0];
      expect(response).to.not.be.null;
      expect(response.rawResult).to.match(/^[a-fA-F0-9]+$/);
    });
  });
});
