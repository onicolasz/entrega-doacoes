import { UserContext } from "@/app/contexts/user.context";
import { useContext } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faCircleCheck } from "@fortawesome/free-solid-svg-icons";
import { faCarSide } from "@fortawesome/free-solid-svg-icons";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface IUser {
  name?: string;
}

type Item = {
  name: string;
  quantity: number;
  weigth: number;
};

type CardProps = {
  userName: string;
  items: Item[];
  fromLocation: string;
  destinationLocation: string;
  deliveryStatus?: string;
  transporter?: IUser;
};

const DonationCard: React.FC<CardProps> = ({
  userName,
  items,
  fromLocation,
  destinationLocation,
  deliveryStatus,
  transporter,
}) => {
  const { user } = useContext(UserContext);
  const firstItem = items[0];
  const additionalItems = items.length - 1;

  const { totalQuantity, totalWeight } = items.reduce(
    (acc, currentItem) => {
      return {
        totalQuantity: acc.totalQuantity + currentItem.quantity,
        totalWeight: acc.totalWeight + currentItem.weigth,
      };
    },
    { totalQuantity: 0, totalWeight: 0 }
  );

  const parseStatus = (status: string) => {
    switch (status) {
      case "FINISHED":
        return "Entregue";
      case "INCOMING":
        return "A caminho";
      default:
        return status;
    }
  };

  return (
    <div className="grid grid-cols-[55%,2%,30%,2%,11%] p-4 bg-white border border-primary text-xs rounded-2xl items-center m-4 drop-shadow-lg">
      <div className="col-span-1 h-full flex flex-col justify-between">
        <div className="flex items-center mb-2">
          <div className="rounded-xl px-2 py-1 bg-secondary font-medium flex items-center justify-center text-xs mr-2">
            {userName}
          </div>
          <div>
            {firstItem.quantity}
            {firstItem.quantity > 1 ? " unidades " : " unidade "}de{" "}
            {firstItem.name} e
            {additionalItems > 0 && (
              <TooltipProvider>
                <Tooltip delayDuration={0}>
                  <TooltipTrigger asChild>
                    <span className="cursor-default ml-1 bg-secondary rounded-full px-2 py-1">
                      +{additionalItems} {additionalItems > 1 ? "itens" : "item"}
                    </span>
                  </TooltipTrigger>
                  <TooltipContent>
                    {items.map((item, index) => {
                      if (index == 0) return <></>

                      return (<p>{item.quantity} {item.quantity > 1 ? "unidades" : "unidade"} de {item.name}</p>)
                    })}
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

            )}
          </div>
        </div>
        <div>
          <div>
            <strong>Origem: </strong> {fromLocation}
          </div>
          <div>
            <strong>Destino: </strong> {destinationLocation}
          </div>
        </div>
      </div>
      <Separator orientation="vertical" className="h-full bg-primary" />
      <div className="col-span-1 h-full flex flex-col justify-center">
        <div>
          <p className="text-lg"><span className="font-semibold">Total de itens:</span> {totalQuantity}</p>
          <p>Peso total: {totalWeight}kg</p>
        </div>
        {(!!user?.transporter_id && !deliveryStatus) && (
          <div>
            <Button className="flex items-center p-1 h-8 mt-1 hover:bg-green-600 hover:font-semibold active:bg-green-700 duration-100 rounded-lg">
              Aceitar entrega
            </Button>
          </div>
        )}
      </div>
      <Separator orientation="vertical" className="h-full bg-primary" />
      <div className="col-span-1 h-full flex flex-col items-center justify-center">
        {deliveryStatus === "FINISHED" && (
          <>
            <FontAwesomeIcon icon={faCircleCheck} size="3x" color="green" />
            {transporter && (
              <div className="font-medium mt-2 text-center">
                <p>
                  {parseStatus(deliveryStatus)} por {transporter.name}
                </p>
              </div>
            )}
          </>
        )}
        {deliveryStatus === "INCOMING" && (
          <>
            <FontAwesomeIcon icon={faCarSide} size="3x" color="orange" />
            {transporter && (
              <div className="font-medium mt-2 text-center">
                <p>
                  {parseStatus(deliveryStatus)} por {transporter.name}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default DonationCard;
