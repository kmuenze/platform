<?php

namespace Oro\Bundle\IntegrationBundle\Provider;

use Oro\Bundle\IntegrationBundle\Entity\Channel;

abstract class AbstractConnector implements ConnectorInterface
{
    /** @var TransportInterface */
    protected $transport;

    /** @var Channel */
    protected $channel = null;

    /** @var bool */
    protected $isConnected = false;

    /**
     * @param TransportInterface $transport
     */
    public function __construct(TransportInterface $transport)
    {
        $this->transport = $transport;
    }

    /**
     * {@inheritdoc}
     */
    public function connect()
    {
        if (is_null($this->channel)) {
            throw new \Exception('There\'s no configured channel in connector');
        }

        $this->isConnected = $this->transport->init($this->channel->getSettings());

        return $this->isConnected;
    }

    /**
     * Used to get/send data from/to remote channel using transport
     *
     * @param string $action
     * @param array $params
     * @return mixed
     */
    protected function call($action, $params = [])
    {
        if ($this->isConnected === false) {
            $this->connect();
        }

        return $this->transport->call($action, $params);
    }

    /**
     * @param Channel $channel
     * @return $this
     */
    public function setChannel(Channel $channel)
    {
        $this->channel = $channel;

        return $this;
    }
}
